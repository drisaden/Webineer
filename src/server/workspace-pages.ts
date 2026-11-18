import { formatDay } from "@/lib/datetime";
import { DISPLAY_TZ } from "@/lib/display-timezone";
import { getCurrentUser } from "@/lib/auth/demo-session";
import { getAuthMode } from "@/lib/supabase/config";
import { getPrisma } from "@/server/db/prisma";
import { flutterwaveConfig } from "@/server/payments/flutterwave";
import { smtpConfig } from "@/server/email/smtp";
import { analyticsService } from "@/services/analytics-service";

/**
 * Live data for workspace pages that used to show sample figures. Demo mode keeps
 * the sample data (via the `demo` argument / mock services); everything else is
 * computed from the active workspace's own records.
 */

export const isDemoMode = () => getAuthMode() === "demo";

async function orgId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.workspaceId ?? null;
}

const SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", EUR: "€", GBP: "£" };
const money = (amount: number, currency: string) => `${SYMBOLS[currency] ?? `${currency} `}${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

export interface AnalyticsSummaryView {
  totalWebinars: number;
  publishedWebinars: number;
  totalRegistrations: number;
  conversionRate: number;
  totalAttendees: number;
  averageAttendanceRate: number;
  revenueLabel: string;
  currencyNote: string;
  note: string;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummaryView | null> {
  if (isDemoMode()) {
    const s = analyticsService.getSummary("30d");
    return { ...s, revenueLabel: `₦${s.revenue.toLocaleString()}`, currencyNote: `${s.currency} tracked`, note: "Measured from real registration and payment events in the mock workspace." };
  }
  const id = await orgId();
  if (!id) return null;
  const db = getPrisma();
  const since = new Date(Date.now() - 30 * 86400e3);
  const [totalWebinars, publishedWebinars, totalRegistrations, views, attended, revenue] = await Promise.all([
    db.webinar.count({ where: { organizationId: id, deletedAt: null } }),
    db.webinar.count({ where: { organizationId: id, deletedAt: null, status: { notIn: ["DRAFT", "ARCHIVED"] } } }),
    db.registration.count({ where: { organizationId: id, registeredAt: { gte: since }, status: { not: "CANCELLED" } } }),
    db.analyticsEvent.count({ where: { organizationId: id, type: "landing_page_viewed", createdAt: { gte: since } } }),
    db.registration.count({ where: { organizationId: id, registeredAt: { gte: since }, status: { in: ["ATTENDED", "CONVERTED"] } } }),
    db.payment.groupBy({ by: ["currency"], where: { organizationId: id, purpose: "WEBINAR_TICKET", status: "SUCCESSFUL", verifiedAt: { gte: since } }, _sum: { amount: true } }),
  ]);
  const revenueLabel = revenue.length ? revenue.map((r) => money(Number(r._sum.amount ?? 0), r.currency)).join(" · ") : money(0, "NGN");
  return {
    totalWebinars,
    publishedWebinars,
    totalRegistrations,
    conversionRate: pct(totalRegistrations, views),
    totalAttendees: attended,
    averageAttendanceRate: pct(attended, totalRegistrations),
    revenueLabel,
    currencyNote: "Verified ticket payments",
    note: "Measured from this workspace's registrations, room entries and verified payments.",
  };
}

export async function getAudienceGroups<T extends { name: string; count: number; metric: string }>(demo: T[]): Promise<{ name: string; count: number; metric: string }[] | null> {
  if (isDemoMode()) return demo;
  const id = await orgId();
  if (!id) return null;
  const db = getPrisma();
  const active = { organizationId: id, status: { not: "CANCELLED" as const } };
  const [total, attended, paid, ctaClicks, replayViewers] = await Promise.all([
    db.registration.count({ where: active }),
    db.registration.count({ where: { ...active, status: { in: ["ATTENDED", "CONVERTED"] } } }),
    db.registration.count({ where: { ...active, paymentStatus: "PAID" } }),
    db.analyticsEvent.findMany({ where: { organizationId: id, type: "cta_clicked", registrationId: { not: null } }, distinct: ["registrationId"], select: { registrationId: true } }),
    db.analyticsEvent.findMany({ where: { organizationId: id, type: "replay_viewed", registrationId: { not: null } }, distinct: ["registrationId"], select: { registrationId: true } }),
  ]);
  const row = (name: string, count: number) => ({ name, count, metric: `${pct(count, total)}%` });
  return [
    row("Registered but never attended", total - attended),
    row("Attended at least once", attended),
    row("Purchased a ticket", paid),
    row("Clicked a CTA", ctaClicks.length),
    row("Watched replay", replayViewers.length),
  ];
}

export async function getIntegrationStatuses<T extends { category: string; name: string; status: string; description: string }>(demo: T[]): Promise<{ category: string; name: string; status: string; description: string }[]> {
  if (isDemoMode()) return demo;
  const flw = flutterwaveConfig();
  const smtp = smtpConfig();
  return [
    { category: "Video", name: "YouTube / Vimeo / external video", status: "Connected", description: "Add a YouTube, Vimeo or other video link to your webinar." },
    { category: "Email", name: "Email delivery", status: smtp ? "Active" : "Unavailable", description: smtp ? "Confirmations, reminders and receipts are sent for you automatically." : "Email delivery is temporarily unavailable. Contact support if this continues." },
    { category: "Payments", name: "Flutterwave", status: !flw ? "Unavailable" : flw.testMode ? "Test mode" : "Active", description: !flw ? "Online payments are temporarily unavailable. Contact support if this continues." : "Secure checkout for paid webinars and plan upgrades." },
    { category: "Calendar", name: "ICS calendar export", status: "Available", description: "Registrants can add their session to any calendar." },
    { category: "Webhooks", name: "Outgoing dispatch", status: "Protected", description: "Send each new registration to your own tools, such as Zapier or Make." },
  ];
}

/** Custom domains aren't live yet: show the workspace's stored domain (if any) honestly. */
export async function getWorkspaceDomains<T>(demo: T[]): Promise<{ rows: T[] | { id: string; domain: string; cnameTarget: string; status: string; verificationToken: string }[]; unavailable: boolean }> {
  if (isDemoMode()) return { rows: demo, unavailable: false };
  const id = await orgId();
  const org = id ? await getPrisma().organization.findUnique({ where: { id }, select: { customDomain: true } }) : null;
  return {
    rows: org?.customDomain ? [{ id: "custom", domain: org.customDomain, cnameTarget: "—", status: "not verified", verificationToken: "—" }] : [],
    unavailable: true,
  };
}

/** Real email activity for the campaigns pages (one-off campaigns don't exist yet). */
export async function getEmailActivity(): Promise<{ queued: number; delivered: number; nextSend: string } | null> {
  const id = await orgId();
  if (!id) return null;
  const db = getPrisma();
  const [queuedEmails, pendingJobs, delivered, next] = await Promise.all([
    db.emailLog.count({ where: { organizationId: id, status: { in: ["QUEUED", "SENDING"] } } }),
    db.automationJob.count({ where: { organizationId: id, type: "notification.send", status: "PENDING" } }),
    db.emailLog.count({ where: { organizationId: id, status: "SENT", sentAt: { gte: new Date(Date.now() - 30 * 86400e3) } } }),
    db.automationJob.findFirst({ where: { organizationId: id, type: "notification.send", status: "PENDING" }, orderBy: { runAt: "asc" }, select: { runAt: true } }),
  ]);
  const nextSend = !next ? "—" : next.runAt.toDateString() === new Date().toDateString() ? "Today" : formatDay(next.runAt, DISPLAY_TZ);
  return { queued: queuedEmails + pendingJobs, delivered, nextSend };
}
