import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { describeSmtpError, isPermanentSmtpError, sendMail, smtpConfig } from "./smtp";

/**
 * Database-backed email outbox. Every email is logged in `email_logs`; a dedupe key makes the
 * same logical email (a given reminder, a given receipt) impossible to send twice; failed sends
 * are retried with backoff by the cron runner. Bodies are kept only until delivery.
 */

export const MAX_EMAIL_ATTEMPTS = 5;
const BACKOFF_MINUTES = [1, 5, 15, 60, 240];
const STALE_SENDING_MS = 10 * 60 * 1000;
const uuid = /^[0-9a-f-]{36}$/i;

export interface QueueEmailInput {
  template: string;
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
  organizationId?: string | null;
  webinarId?: string | null;
  registrationId?: string | null;
  dedupeKey?: string | null;
}

export type QueueResult = { status: "queued"; id: string } | { status: "duplicate"; id: string | null } | { status: "skipped"; id: string; reason: string };

const validEmail = (e: string) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e) && e.length <= 254;

export async function queueEmail(input: QueueEmailInput): Promise<QueueResult> {
  const db = getPrisma();
  const to = input.to.trim().toLowerCase();
  const configured = smtpConfig() !== null;
  const skipReason = !validEmail(to) ? "Invalid recipient address." : !configured ? "SMTP is not configured." : null;
  try {
    const row = await db.emailLog.create({
      data: {
        template: input.template.slice(0, 80),
        toEmail: to.slice(0, 254),
        toName: input.toName?.slice(0, 120) ?? null,
        subject: input.subject.replace(/[\r\n]+/g, " ").slice(0, 250),
        organizationId: input.organizationId && uuid.test(input.organizationId) ? input.organizationId : null,
        webinarId: input.webinarId && uuid.test(input.webinarId) ? input.webinarId : null,
        registrationId: input.registrationId && uuid.test(input.registrationId) ? input.registrationId : null,
        dedupeKey: input.dedupeKey?.slice(0, 300) ?? null,
        status: skipReason ? "SKIPPED" : "QUEUED",
        lastError: skipReason,
        bodyHtml: skipReason ? null : input.html,
        bodyText: skipReason ? null : input.text,
        scheduledFor: new Date(),
      },
    });
    return skipReason ? { status: "skipped", id: row.id, reason: skipReason } : { status: "queued", id: row.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = input.dedupeKey ? await db.emailLog.findUnique({ where: { dedupeKey: input.dedupeKey }, select: { id: true } }) : null;
      return { status: "duplicate", id: existing?.id ?? null };
    }
    throw error;
  }
}

export type DeliveryOutcome = "sent" | "retry" | "failed" | "skipped" | "busy";

/** Try to deliver one email. Safe to call concurrently: only one caller can claim it. */
export async function deliverEmail(id: string): Promise<DeliveryOutcome> {
  const db = getPrisma();
  const cfg = smtpConfig();
  const now = new Date();
  // Claim: QUEUED/FAILED-with-retries-left whose time has come, or a SENDING row stuck after a crash.
  const claimed = await db.emailLog.updateMany({
    where: {
      id,
      attempts: { lt: MAX_EMAIL_ATTEMPTS },
      OR: [
        { status: { in: ["QUEUED", "FAILED"] }, OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }] },
        { status: "SENDING", updatedAt: { lt: new Date(now.getTime() - STALE_SENDING_MS) } },
      ],
    },
    data: { status: "SENDING", attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return "busy";
  const row = await db.emailLog.findUniqueOrThrow({ where: { id } });
  if (!cfg) {
    await db.emailLog.update({ where: { id }, data: { status: "SKIPPED", lastError: "SMTP is not configured.", bodyHtml: null, bodyText: null } });
    return "skipped";
  }
  if (!row.bodyHtml && !row.bodyText) {
    await db.emailLog.update({ where: { id }, data: { status: "FAILED", attempts: MAX_EMAIL_ATTEMPTS, lastError: "No content to send." } });
    return "failed";
  }
  try {
    const { messageId } = await sendMail(cfg, { to: row.toEmail, toName: row.toName, subject: row.subject, html: row.bodyHtml ?? "", text: row.bodyText ?? "", messageKey: row.id });
    await db.emailLog.update({ where: { id }, data: { status: "SENT", sentAt: new Date(), providerMessageId: messageId, lastError: null, bodyHtml: null, bodyText: null } });
    return "sent";
  } catch (error) {
    const permanent = isPermanentSmtpError(error);
    const exhausted = permanent || row.attempts >= MAX_EMAIL_ATTEMPTS;
    const delay = BACKOFF_MINUTES[Math.min(row.attempts - 1, BACKOFF_MINUTES.length - 1)] * 60_000;
    await db.emailLog.update({
      where: { id },
      data: {
        status: "FAILED",
        lastError: describeSmtpError(error),
        attempts: exhausted ? MAX_EMAIL_ATTEMPTS : row.attempts,
        scheduledFor: exhausted ? null : new Date(Date.now() + delay),
        ...(exhausted ? { bodyHtml: null, bodyText: null } : {}),
      },
    });
    console.error(`[email] ${exhausted ? "gave up on" : "will retry"} ${row.template} to ${row.toEmail.replace(/(.).*@/, "$1***@")}: ${describeSmtpError(error)}`);
    return exhausted ? "failed" : "retry";
  }
}

/** Queue and attempt immediate delivery (bounded); failures stay queued for the retry runner. */
export async function sendNow(input: QueueEmailInput, timeoutMs = 12_000): Promise<QueueResult & { delivery?: DeliveryOutcome }> {
  const queued = await queueEmail(input);
  if (queued.status !== "queued") return queued;
  const delivery = await Promise.race([
    deliverEmail(queued.id).catch((error) => {
      console.error("[email] delivery crashed", error);
      return "retry" as const;
    }),
    new Promise<DeliveryOutcome>((resolve) => setTimeout(() => resolve("retry"), timeoutMs)),
  ]);
  return { ...queued, delivery };
}

/**
 * Queue, then deliver after the HTTP response is sent (Next.js `after`, kept alive on Vercel).
 * Outside a request (cron, scripts, tests) delivery is awaited instead.
 */
export async function queueAndDeliver(input: QueueEmailInput): Promise<QueueResult> {
  const queued = await queueEmail(input);
  if (queued.status !== "queued") return queued;
  const run = () => deliverEmail(queued.id).catch((error) => console.error("[email] delivery crashed", error));
  try {
    const { after } = await import("next/server");
    after(run);
  } catch {
    await run();
  }
  return queued;
}

/** Retry runner (cron): delivers due QUEUED/FAILED emails and reclaims stuck SENDING rows. */
export async function processEmailQueue(limit = 50): Promise<Record<DeliveryOutcome, number>> {
  const db = getPrisma();
  const now = new Date();
  const due = await db.emailLog.findMany({
    where: {
      attempts: { lt: MAX_EMAIL_ATTEMPTS },
      OR: [
        { status: { in: ["QUEUED", "FAILED"] }, OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }] },
        { status: "SENDING", updatedAt: { lt: new Date(now.getTime() - STALE_SENDING_MS) } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  const counts: Record<DeliveryOutcome, number> = { sent: 0, retry: 0, failed: 0, skipped: 0, busy: 0 };
  for (const { id } of due) counts[await deliverEmail(id)] += 1;
  return counts;
}
