import { getAuthMode } from "@/lib/supabase/config";
import { getAppSession, getSessionUser } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorize";
import { orgRoleHasPermission } from "@/server/auth/permissions";
import { getPrisma } from "@/server/db/prisma";

export type NotificationKind = "registration" | "payment" | "payment_failed" | "email_failed" | "webinar_soon" | "webinar_live";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  href: string;
  /** ISO timestamp the event happened (or became relevant). */
  at: string;
  unread: boolean;
}

export interface NotificationFeed {
  items: NotificationItem[];
  unread: number;
}

const WINDOW_DAYS = 14;
const PER_SOURCE = 30;
const MAX_ITEMS = 20;
const SOON_HOURS = 24;

const EMPTY: NotificationFeed = { items: [], unread: 0 };

const money = (amount: unknown, currency: string) => {
  const n = Number(amount);
  const symbol = ({ NGN: "₦", USD: "$", EUR: "€", GBP: "£" } as Record<string, string>)[currency] ?? `${currency} `;
  return `${symbol}${Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`;
};

const TEMPLATE_LABELS: Record<string, string> = {
  confirmation: "Registration confirmation",
  reminder_24h: "24-hour reminder",
  reminder_1h: "1-hour reminder",
  reminder_15m: "15-minute reminder",
  thank_you: "Thank-you email",
  replay: "Replay email",
  follow_up: "Follow-up email",
  receipt: "Payment receipt",
};
const templateLabel = (t: string) => TEMPLATE_LABELS[t] ?? t.replace(/_/g, " ");

/**
 * What happened in the signed-in user's workspace recently, built from real records (registrations,
 * payments, failed emails, webinars about to start). Each source is only included if the user's role
 * can see it elsewhere in the app. Nothing here is stored per notification: "unread" is just "newer
 * than the last time this user opened the bell".
 */
export async function listNotifications(now = new Date()): Promise<NotificationFeed> {
  if (getAuthMode() !== "supabase") return EMPTY;
  const session = await getSessionUser();
  const app = await getAppSession();
  if (!session || !app) throw new AuthorizationError("Sign in to continue.", 401);
  const db = getPrisma();
  const role = app.role;
  const can = (p: Parameters<typeof orgRoleHasPermission>[1]) => orgRoleHasPermission(role, p);
  const orgId = app.organization.id;
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  const soonUntil = new Date(now.getTime() + SOON_HOURS * 3_600_000);

  const [me, registrations, payments, emails, webinars] = await Promise.all([
    db.user.findUnique({ where: { id: session.id }, select: { notificationsSeenAt: true } }),
    can("registration.view")
      ? db.registration.findMany({
          where: { organizationId: orgId, registeredAt: { gte: since }, status: { not: "CANCELLED" } },
          orderBy: { registeredAt: "desc" },
          take: PER_SOURCE,
          select: { id: true, name: true, registeredAt: true, webinar: { select: { id: true, title: true } } },
        })
      : [],
    can("payment.view")
      ? db.payment.findMany({
          where: { organizationId: orgId, status: { in: ["SUCCESSFUL", "FAILED"] }, updatedAt: { gte: since } },
          orderBy: { updatedAt: "desc" },
          take: PER_SOURCE,
          select: { id: true, status: true, purpose: true, amount: true, currency: true, updatedAt: true, verifiedAt: true, webinar: { select: { title: true } } },
        })
      : [],
    can("email.manage")
      ? db.emailLog.findMany({
          where: { organizationId: orgId, status: "FAILED", updatedAt: { gte: since } },
          orderBy: { updatedAt: "desc" },
          take: PER_SOURCE,
          select: { id: true, template: true, toEmail: true, updatedAt: true },
        })
      : [],
    can("webinar.view")
      ? db.webinar.findMany({
          where: { organizationId: orgId, deletedAt: null, status: { in: ["SCHEDULED", "LIVE"] }, startsAt: { gte: new Date(now.getTime() - 3 * 3_600_000), lte: soonUntil } },
          orderBy: { startsAt: "asc" },
          take: 10,
          select: { id: true, title: true, status: true, startsAt: true },
        })
      : [],
  ]);

  const seenAt = me?.notificationsSeenAt ?? null;
  const raw: Omit<NotificationItem, "unread">[] = [];

  for (const r of registrations) {
    raw.push({ id: `reg:${r.id}`, kind: "registration", title: "New registration", detail: `${r.name || "Someone"} registered for ${r.webinar.title}`, href: "/dashboard/registrants", at: r.registeredAt.toISOString() });
  }
  for (const p of payments) {
    const at = (p.verifiedAt ?? p.updatedAt).toISOString();
    const what = p.purpose === "PLATFORM_SUBSCRIPTION" ? "your plan" : p.webinar?.title ? `“${p.webinar.title}”` : "a webinar ticket";
    if (p.status === "SUCCESSFUL") raw.push({ id: `pay:${p.id}`, kind: "payment", title: p.purpose === "PLATFORM_SUBSCRIPTION" ? "Plan payment confirmed" : "Payment received", detail: `${money(p.amount, p.currency)} for ${what}`, href: "/dashboard/billing", at });
    else raw.push({ id: `payfail:${p.id}`, kind: "payment_failed", title: "Payment failed", detail: `${money(p.amount, p.currency)} for ${what} did not go through`, href: "/dashboard/billing", at });
  }
  for (const e of emails) {
    raw.push({ id: `mail:${e.id}`, kind: "email_failed", title: "Email could not be delivered", detail: `${templateLabel(e.template)} to ${e.toEmail}`, href: "/dashboard/emails", at: e.updatedAt.toISOString() });
  }
  for (const w of webinars) {
    if (!w.startsAt) continue;
    const started = w.startsAt.getTime() <= now.getTime();
    // "At" is when it became worth knowing about: 24h before the start, or the start itself once it is under way.
    const at = started ? w.startsAt : new Date(Math.min(now.getTime(), w.startsAt.getTime() - SOON_HOURS * 3_600_000));
    raw.push({
      id: `${started ? "live" : "soon"}:${w.id}`,
      kind: started ? "webinar_live" : "webinar_soon",
      title: started ? "Webinar is live or just started" : "Webinar starting soon",
      detail: w.title,
      href: `/dashboard/webinars/${w.id}`,
      at: at.toISOString(),
    });
  }

  raw.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const items = raw.slice(0, MAX_ITEMS).map((n) => ({ ...n, unread: !seenAt || new Date(n.at) > seenAt }));
  return { items, unread: items.filter((i) => i.unread).length };
}

/** Everything up to now counts as read for this user (one value per user, so it follows them across devices). */
export async function markNotificationsRead(now = new Date()): Promise<void> {
  if (getAuthMode() !== "supabase") return;
  const session = await getSessionUser();
  if (!session) throw new AuthorizationError("Sign in to continue.", 401);
  await getPrisma().user.update({ where: { id: session.id }, data: { notificationsSeenAt: now } });
}
