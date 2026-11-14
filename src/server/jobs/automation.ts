import { getPrisma } from "@/server/db/prisma";
import { getStore } from "@/server/repositories";
import { primarySessionWindow, nextEvergreenSession } from "@/lib/webinar-workflow/sync";
import { resolveSessions, zonedToUtc } from "@/lib/webinar-workflow/time";
import { sendWorkflowEmail, sessionStartFor } from "@/services/workflow-notifications";
import { processEmailQueue } from "@/server/email/outbox";
import { confirmPayment } from "@/server/payments/service";
import { enqueueJob, runDueJobs, type JobHandler } from "./queue";
import type { EmailMessageSettings, EmailTemplateType, Registration, Webinar } from "@/types";

/**
 * Webinar automation on top of the job queue:
 *  - notification planning (reminders, thank-you, replay, follow-ups) per registration & session,
 *    in the webinar's time zone (DST-safe: sessions are resolved to UTC instants)
 *  - webinar lifecycle (scheduled -> live -> completed), recurring sessions included
 *  - payment reconciliation (missed webhooks), subscription expiry, email retries, cleanup
 */

const TICK_LOOKAHEAD_MS = 15 * 60 * 1000;
/** Reminders before a session are pointless once it has started; after-session emails may run late. */
const MAX_LATE_BEFORE_MS = 60 * 60 * 1000;
const MAX_LATE_AFTER_MS = 24 * 60 * 60 * 1000;

type Kind = "reminder" | "thank_you" | "replay" | "follow_up";
export interface PlannedNotification {
  key: string;
  kind: Kind;
  itemId: string;
  dueAt: Date;
  sessionStart: Date;
  registrationId: string;
  registeredAt: Date;
  templateType: EmailTemplateType;
  message: EmailMessageSettings;
}

function replayExpiresAt(webinar: Webinar, sessionEnd: Date): Date | null {
  const r = webinar.workflow?.replay;
  if (!r) return null;
  if (r.expiration === "days_after") return new Date(sessionEnd.getTime() + r.expiresAfterDays * 86400e3);
  if (r.expiration === "date" && r.expiresOn) return zonedToUtc(r.expiresOn, "23:59", webinar.workflow!.schedules.timezone);
  return null;
}

/** Every notification a registration should get, with its due time. Keys match the email dedupe keys. */
export function planForRegistration(webinar: Webinar, registration: Registration): PlannedNotification[] {
  const config = webinar.workflow;
  if (!config || webinar.status === "draft") return [];
  if (registration.status === "cancelled" || registration.paymentStatus === "pending" || registration.paymentStatus === "failed") return [];
  const start = sessionStartFor(webinar, registration);
  const end = new Date(start.getTime() + Math.max(1, config.schedules.durationMinutes || 60) * 60_000);
  const sessionKey = start.toISOString();
  const out: PlannedNotification[] = [];
  const add = (itemId: string, kind: Kind, dueAt: Date, message: EmailMessageSettings, templateType: EmailTemplateType) => {
    if (!message.enabled) return;
    out.push({ key: `${registration.id}:${sessionKey}:${itemId}`, kind, itemId, dueAt, sessionStart: start, registrationId: registration.id, registeredAt: new Date(registration.registeredAt), templateType, message });
  };
  for (const reminder of config.notifications.reminders) {
    const type: EmailTemplateType = reminder.minutesBefore >= 1440 ? "reminder_24h" : reminder.minutesBefore >= 60 ? "reminder_1h" : "reminder_15m";
    add(reminder.id, "reminder", new Date(start.getTime() - reminder.minutesBefore * 60_000), reminder, type);
  }
  add("thank_you", "thank_you", new Date(end.getTime() + config.notifications.thankYouEmail.minutesAfter * 60_000), config.notifications.thankYouEmail, "thank_you");
  if (config.replay.enabled) add("replay", "replay", end, config.notifications.replayEmail, "replay_available");
  for (const followUp of config.notifications.followUps) {
    add(followUp.id, "follow_up", new Date(end.getTime() + followUp.minutesAfter * 60_000), followUp, "post_webinar_followup");
  }
  return out;
}

/** Is a planned item still worth sending at `now`? */
export function stillSendable(webinar: Webinar, item: PlannedNotification, now: Date): { ok: true } | { ok: false; reason: string } {
  const late = now.getTime() - item.dueAt.getTime();
  if (late < 0) return { ok: false, reason: "not due yet" };
  if (item.kind === "reminder") {
    if (now.getTime() >= item.sessionStart.getTime()) return { ok: false, reason: "session already started" };
    // Registered after this reminder was due: the confirmation email already covered it.
    if (item.registeredAt.getTime() > item.dueAt.getTime()) return { ok: false, reason: "registered after reminder time" };
    if (late > MAX_LATE_BEFORE_MS) return { ok: false, reason: "too late" };
  } else if (late > MAX_LATE_AFTER_MS) {
    return { ok: false, reason: "too late" };
  }
  if (item.kind === "replay") {
    const durationMs = Math.max(1, webinar.workflow!.schedules.durationMinutes || 60) * 60_000;
    const expires = replayExpiresAt(webinar, new Date(item.sessionStart.getTime() + durationMs));
    if (expires && now >= expires) return { ok: false, reason: "replay expired" };
  }
  return { ok: true };
}

/** Enqueue notification jobs that fall due before the next tick (exact runAt; dedupe key per item). */
export async function planNotifications(now = new Date()): Promise<{ planned: number; duplicates: number }> {
  const store = getStore();
  let planned = 0, duplicates = 0;
  for (const webinar of await store.listActiveWebinars()) {
    if (!webinar.workflow || webinar.status === "paused") continue;
    // Long-finished webinars have nothing left to send (follow-ups are capped at 24h late).
    if (webinar.status === "completed" && primarySessionWindow(webinar, now).endsAt.getTime() < now.getTime() - 30 * 86400e3) continue;
    const registrations = await store.listRegistrations(webinar.id);
    for (const registration of registrations) {
      for (const item of planForRegistration(webinar, registration)) {
        if (item.dueAt.getTime() > now.getTime() + TICK_LOOKAHEAD_MS) continue;
        if (!stillSendable(webinar, item, item.dueAt > now ? item.dueAt : now).ok) continue;
        const r = await enqueueJob({
          type: "notification.send",
          organizationId: webinar.workspaceId,
          runAt: item.dueAt > now ? item.dueAt : now,
          dedupeKey: `notify:${item.key}`,
          payload: { webinarId: webinar.id, registrationId: registration.id, key: item.key },
          maxAttempts: 3,
        });
        if (r.status === "enqueued") planned += 1; else duplicates += 1;
      }
    }
  }
  return { planned, duplicates };
}

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

const sendNotification: JobHandler = async (payload) => {
  const store = getStore();
  const webinar = await store.getWebinar(String(payload.webinarId));
  if (!webinar?.workflow) return { skipped: "webinar gone" };
  const registration = await store.getRegistration(String(payload.registrationId));
  if (!registration || registration.webinarId !== webinar.id) return { skipped: "registration gone" };
  // Re-plan at send time: schedule edits, cancellations, disabled emails and expired replays all apply.
  const item = planForRegistration(webinar, registration).find((p) => p.key === payload.key);
  if (!item) return { skipped: "no longer scheduled" };
  const check = stillSendable(webinar, item, new Date());
  if (!check.ok) return { skipped: check.reason };
  // Delivery retries are the outbox's job; this job only has to hand the email over once.
  const record = await sendWorkflowEmail(webinar, registration, item.message, item.templateType, appOrigin(), `notify:${item.key}`);
  if (record?.status === "failed") return { skipped: record.errorMessage ?? "email not queued" };
  return { sent: item.kind, emailId: record?.id ?? null };
};

/** Status follows the schedule: live while a session runs, completed after the last one. */
export function lifecycleStatus(webinar: Webinar, now = new Date()): Webinar["status"] | null {
  const config = webinar.workflow;
  if (!config || !["scheduled", "live", "completed"].includes(webinar.status)) return null;
  const mode = config.configuration.mode;
  if (mode === "always_on") return nextEvergreenSession(config, now) || config.schedules.evergreen.type === "instant" ? "live" : "completed";
  if (mode === "right_now") {
    const { endsAt } = primarySessionWindow(webinar, now);
    return now >= endsAt ? "completed" : "live";
  }
  const sessions = resolveSessions(config.schedules).filter((s) => s.status !== "cancelled");
  if (sessions.length === 0) return webinar.status;
  if (sessions.some((s) => new Date(s.startsAt) <= now && now < new Date(s.endsAt))) return "live";
  if (sessions.some((s) => new Date(s.startsAt) > now)) return "scheduled";
  return "completed";
}

const lifecycle: JobHandler = async () => {
  const db = getPrisma();
  const changes: { id: string; from: string; to: string }[] = [];
  for (const webinar of await getStore().listActiveWebinars()) {
    const next = lifecycleStatus(webinar);
    if (!next || next === webinar.status) continue;
    // Status only (no workflow version bump), and only if nobody changed it meanwhile.
    const res = await db.webinar.updateMany({ where: { id: webinar.id, status: webinar.status.toUpperCase() as never, deletedAt: null }, data: { status: next.toUpperCase() as never } });
    if (res.count) changes.push({ id: webinar.id, from: webinar.status, to: next });
  }
  return { changes };
};

/** Catch payments whose webhook never arrived; give up on checkouts abandoned for 48h. */
const reconcilePayments: JobHandler = async () => {
  const db = getPrisma();
  const now = Date.now();
  const pending = await db.payment.findMany({
    where: { status: "PENDING", provider: "FLUTTERWAVE", checkoutUrl: { not: null }, createdAt: { lt: new Date(now - 10 * 60_000), gt: new Date(now - 7 * 86400e3) } },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true, txRef: true, createdAt: true, registrationId: true, webinarId: true, purpose: true },
  });
  const result = { checked: 0, completed: 0, failed: 0, expired: 0 };
  for (const p of pending) {
    result.checked += 1;
    const r = await confirmPayment({ txRef: p.txRef, source: "manual" });
    if (r.outcome === "successful" && r.newlyCompleted) {
      result.completed += 1;
      if (p.purpose === "WEBINAR_TICKET" && p.registrationId && p.webinarId) {
        const webinar = await getStore().getWebinar(p.webinarId);
        const { fulfilTicket } = await import("@/services/registration-service");
        if (webinar) await fulfilTicket(webinar, p.registrationId, appOrigin());
      }
    } else if (r.outcome === "failed") {
      result.failed += 1;
    } else if (r.outcome === "pending" && now - p.createdAt.getTime() > 48 * 3600e3) {
      const res = await db.payment.updateMany({ where: { id: p.id, status: "PENDING" }, data: { status: "CANCELLED", failureReason: "Checkout abandoned (no payment after 48 hours)." } });
      if (res.count && p.registrationId) await db.registration.updateMany({ where: { id: p.registrationId, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED" } });
      result.expired += res.count;
    }
  }
  return result;
};

/** Expired prepaid plans: mark the subscription expired and drop the cached plan to Free. */
const expireSubscriptions: JobHandler = async () => {
  const db = getPrisma();
  const expired = await db.subscription.findMany({ where: { status: "ACTIVE", currentPeriodEnd: { lt: new Date() } }, select: { id: true, organizationId: true } });
  for (const sub of expired) {
    await db.$transaction(async (tx) => {
      await tx.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
      const stillActive = await tx.subscription.count({ where: { organizationId: sub.organizationId, status: "ACTIVE", currentPeriodEnd: { gt: new Date() } } });
      if (!stillActive) await tx.organization.update({ where: { id: sub.organizationId }, data: { plan: "FREE" } });
    });
  }
  return { expired: expired.length };
};

const retryEmails: JobHandler = async () => ({ ...(await processEmailQueue(100)) });

const planJob: JobHandler = async () => ({ ...(await planNotifications()) });

/** Housekeeping: finished jobs older than 30 days (runs cascade) and stale rate-limit rows. Financial and email logs are kept. */
const cleanup: JobHandler = async () => {
  const cutoff = new Date(Date.now() - 30 * 86400e3);
  const db = getPrisma();
  const { count } = await db.automationJob.deleteMany({ where: { status: { in: ["SUCCEEDED", "CANCELLED"] }, updatedAt: { lt: cutoff } } });
  const limits = await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 2 * 86400e3) } } });
  return { deletedJobs: count, deletedRateLimits: limits.count };
};

export const JOB_HANDLERS: Record<string, JobHandler> = {
  "notification.send": sendNotification,
  "notifications.plan": planJob,
  "webinar.lifecycle": lifecycle,
  "payments.reconcile": reconcilePayments,
  "subscriptions.expire": expireSubscriptions,
  "email.retry": retryEmails,
  "jobs.cleanup": cleanup,
};

/**
 * One scheduler tick. Maintenance jobs are enqueued with a time-bucket dedupe key, so
 * overlapping or repeated ticks (cron retries, two schedulers) never duplicate work.
 */
export async function tick(opts: { now?: Date; budgetMs?: number } = {}) {
  const now = opts.now ?? new Date();
  const bucket5 = Math.floor(now.getTime() / (5 * 60_000));
  const day = now.toISOString().slice(0, 10);
  const maintenance: [string, string][] = [
    ["notifications.plan", `maint:plan:${bucket5}`],
    ["webinar.lifecycle", `maint:lifecycle:${bucket5}`],
    ["email.retry", `maint:email:${bucket5}`],
    ["payments.reconcile", `maint:payments:${bucket5}`],
    ["subscriptions.expire", `maint:subs:${bucket5}`],
    ["jobs.cleanup", `maint:cleanup:${day}`],
  ];
  let enqueued = 0;
  for (const [type, dedupeKey] of maintenance) {
    if ((await enqueueJob({ type, dedupeKey, runAt: now, maxAttempts: 2 })).status === "enqueued") enqueued += 1;
  }
  const ran = await runDueJobs(JOB_HANDLERS, { budgetMs: opts.budgetMs ?? 40_000 });
  return { maintenanceEnqueued: enqueued, ...ran };
}
