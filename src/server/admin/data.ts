import { notFound } from "next/navigation";
import * as mock from "@/data/mock/admin";
import type { AdminPermission } from "@/lib/admin/permissions";
import { getAuthMode } from "@/lib/supabase/config";
import { AuthorizationError, requirePlatformPermission } from "@/server/auth/authorize";
import { getSessionUser } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";
import { flutterwaveConfig } from "@/server/payments/flutterwave";
import { smtpConfig } from "@/server/email/smtp";
import { hookSecrets } from "@/server/email/auth-hook";
import { SAAS_PLANS } from "@/services/billing-entitlements";

/**
 * Platform admin data. Demo mode returns the sample data the admin UI was designed with;
 * every other mode reads the database, after checking the admin's permission for that
 * dataset (404 when missing, so the admin area is not discoverable).
 */

const isDemo = () => getAuthMode() === "demo";

async function requireAdmin(permission: AdminPermission) {
  const session = await getSessionUser();
  try {
    await requirePlatformPermission(getPrisma(), session, permission);
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
}

/** Non-throwing permission check (for hiding parts of a page). */
async function adminCan(permission: AdminPermission): Promise<boolean> {
  const session = await getSessionUser();
  try {
    await requirePlatformPermission(getPrisma(), session, permission);
    return true;
  } catch {
    return false;
  }
}

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "—");
function ago(d: Date | null | undefined): string {
  if (!d) return "—";
  const m = Math.round((Date.now() - d.getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const dd = Math.round(h / 24);
  return dd === 1 ? "Yesterday" : `${dd} days ago`;
}
const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
const SYMBOLS: Record<string, string> = { NGN: "NGN ", USD: "$", EUR: "€", GBP: "£" };
export const money = (amount: number, currency: string) => `${SYMBOLS[currency] ?? `${currency} `}${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const uuid = /^[0-9a-f-]{36}$/i;

// ---------------------------------------------------------------------------
// Users & workspaces
// ---------------------------------------------------------------------------

export type AdminUserRow = (typeof mock.platformUsers)[number];

export async function adminUsers(limit = 200): Promise<AdminUserRow[]> {
  if (isDemo()) return mock.platformUsers;
  await requireAdmin("admin.users.view");
  const users = await getPrisma().user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { memberships: { where: { status: "ACTIVE" }, include: { organization: { select: { plan: true } } } }, platformAdmin: true },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name || u.email,
    email: u.email,
    status: u.status.toLowerCase(),
    workspaceCount: u.memberships.length,
    plan: u.memberships[0] ? title(u.memberships[0].organization.plan) : "—",
    registrationDate: day(u.createdAt),
    lastActivity: ago(u.lastSignInAt),
    role: u.platformAdmin && !u.platformAdmin.revokedAt ? u.platformAdmin.role.toLowerCase().replace("_", "-") : u.memberships[0]?.role.toLowerCase() ?? "member",
  }));
}

export async function adminUser(id: string) {
  if (isDemo()) {
    const user = mock.platformUsers.find((u) => u.id === id) ?? mock.platformUsers[0];
    return { user, stats: { webinars: 9, registrations: 2540, automations: 5 }, lastAdminAction: "User account reviewed" };
  }
  await requireAdmin("admin.users.view");
  if (!uuid.test(id)) notFound();
  const db = getPrisma();
  const rows = (await adminUsersById([id]))[0];
  if (!rows) notFound();
  const orgIds = (await db.membership.findMany({ where: { userId: id, status: "ACTIVE" }, select: { organizationId: true } })).map((m) => m.organizationId);
  const [webinars, registrations, automations, lastAudit] = await Promise.all([
    db.webinar.count({ where: { ownerId: id, deletedAt: null, status: { not: "DRAFT" } } }),
    db.registration.count({ where: { organizationId: { in: orgIds } } }),
    db.automationJob.count({ where: { organizationId: { in: orgIds }, type: "notification.send", status: "SUCCEEDED" } }),
    db.auditLog.findFirst({ where: { targetId: id }, orderBy: { createdAt: "desc" } }),
  ]);
  return { user: rows, stats: { webinars, registrations, automations }, lastAdminAction: lastAudit ? `${lastAudit.action} (${ago(lastAudit.createdAt)})` : "None" };
}

async function adminUsersById(ids: string[]) {
  const users = await getPrisma().user.findMany({ where: { id: { in: ids } }, include: { memberships: { where: { status: "ACTIVE" }, include: { organization: { select: { plan: true } } } }, platformAdmin: true } });
  return users.map((u) => ({
    id: u.id,
    name: u.name || u.email,
    email: u.email,
    status: u.status.toLowerCase(),
    workspaceCount: u.memberships.length,
    plan: u.memberships[0] ? title(u.memberships[0].organization.plan) : "—",
    registrationDate: day(u.createdAt),
    lastActivity: ago(u.lastSignInAt),
    role: u.platformAdmin && !u.platformAdmin.revokedAt ? u.platformAdmin.role.toLowerCase().replace("_", "-") : u.memberships[0]?.role.toLowerCase() ?? "member",
  }));
}

export type AdminWorkspaceRow = (typeof mock.platformWorkspaces)[number];

export async function adminWorkspaces(limit = 200, ids?: string[]): Promise<AdminWorkspaceRow[]> {
  if (isDemo()) return mock.platformWorkspaces;
  await requireAdmin("admin.workspaces.view");
  const orgs = await getPrisma().organization.findMany({
    where: ids ? { id: { in: ids } } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      memberships: { where: { status: "ACTIVE" }, include: { user: { select: { name: true, email: true } } } },
      _count: { select: { webinars: { where: { deletedAt: null } } } },
    },
  });
  return orgs.map((o) => {
    const owner = o.memberships.find((m) => m.role === "OWNER");
    const limitWebinars = SAAS_PLANS[o.plan.toLowerCase() as keyof typeof SAAS_PLANS]?.entitlements.maxWebinars ?? 0;
    return {
      id: o.id,
      name: o.name,
      owner: owner ? owner.user.name || owner.user.email : "—",
      members: o.memberships.length,
      webinars: o._count.webinars,
      plan: title(o.plan),
      usage: limitWebinars ? `${Math.min(100, Math.round((o._count.webinars / limitWebinars) * 100))}%` : "—",
      status: o.deletedAt ? "deleted" : o.status.toLowerCase(),
      created: day(o.createdAt),
    };
  });
}

export async function adminWorkspace(id: string) {
  if (isDemo()) return mock.platformWorkspaces.find((w) => w.id === id) ?? mock.platformWorkspaces[0];
  if (!uuid.test(id)) notFound();
  const [row] = await adminWorkspaces(1, [id]);
  if (!row) notFound();
  return row;
}

// ---------------------------------------------------------------------------
// Webinars, registrations, contacts, landing pages
// ---------------------------------------------------------------------------

export type AdminWebinarRow = (typeof mock.platformWebinars)[number];

export async function adminWebinars(limit = 200): Promise<AdminWebinarRow[]> {
  if (isDemo()) return mock.platformWebinars;
  await requireAdmin("admin.webinars.view");
  const rows = await getPrisma().webinar.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { organization: { select: { name: true } }, owner: { select: { name: true, email: true } }, _count: { select: { registrations: true } } },
  });
  return rows.map((w) => ({
    id: w.id,
    title: w.title,
    workspace: w.organization.name,
    owner: w.owner ? w.owner.name || w.owner.email : "—",
    type: w.type.toLowerCase(),
    status: w.status.toLowerCase(),
    scheduled: day(w.startsAt),
    registrations: w._count.registrations,
    paymentStatus: (w.workflow as { integrations?: { payment?: { enabled?: boolean } } } | null)?.integrations?.payment?.enabled ? "paid" : "free",
    created: day(w.createdAt),
  }));
}

export async function adminRegistrations(demo: { webinar: string; email: string; status: string; seat: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.webinars.view");
  const rows = await getPrisma().registration.findMany({ orderBy: { registeredAt: "desc" }, take: 200, include: { webinar: { select: { title: true } } } });
  return rows.map((r) => ({ webinar: r.webinar.title, email: r.email, status: r.status === "CANCELLED" ? "cancelled" : r.paymentStatus === "PENDING" ? "awaiting payment" : "confirmed", seat: r.paymentStatus === "PAID" ? "Paid" : "Free" }));
}

export async function adminContacts(demo: { name: string; email: string; source: string; status: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.users.view");
  const rows = await getPrisma().registration.findMany({ distinct: ["email"], orderBy: { registeredAt: "desc" }, take: 200, select: { name: true, email: true, source: true, status: true } });
  return rows.map((r) => ({ name: r.name, email: r.email, source: title(r.source), status: r.status === "CANCELLED" ? "cancelled" : "active" }));
}

export async function adminLandingPages(demo: { title: string; workspace: string; status: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.webinars.view");
  const rows = await getPrisma().landingPage.findMany({ where: { webinar: { deletedAt: null } }, orderBy: { updatedAt: "desc" }, take: 200, include: { webinar: { select: { organization: { select: { name: true } } } } } });
  return rows.map((p) => ({ title: p.title, workspace: p.webinar.organization.name, status: p.status.toLowerCase() }));
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export type AdminTransactionRow = (typeof mock.platformTransactions)[number];

export async function adminTransactions(limit = 200, ids?: string[]): Promise<AdminTransactionRow[]> {
  if (isDemo()) return mock.platformTransactions;
  await requireAdmin("admin.transactions.view");
  const rows = await getPrisma().payment.findMany({ where: ids ? { id: { in: ids } } : {}, orderBy: { createdAt: "desc" }, take: limit, include: { organization: { select: { name: true } } } });
  return rows.map((p) => ({
    id: p.id,
    provider: title(p.provider),
    customer: p.purpose === "PLATFORM_SUBSCRIPTION" ? p.organization.name : `${p.customerName || p.customerEmail} · ${p.organization.name}`,
    amount: Number(p.amount),
    currency: p.currency,
    type: p.purpose === "PLATFORM_SUBSCRIPTION" ? "subscription" : "webinar_ticket",
    status: p.status === "SUCCESSFUL" ? "completed" : p.status.toLowerCase(),
    date: day(p.createdAt),
    reference: p.txRef,
  }));
}

export async function adminTransaction(id: string) {
  if (isDemo()) return { txn: mock.platformTransactions.find((t) => t.id === id) ?? mock.platformTransactions[0], failureReason: null as string | null, events: [] as { type: string; at: string }[] };
  if (!uuid.test(id)) notFound();
  const [txn] = await adminTransactions(1, [id]);
  if (!txn) notFound();
  const db = getPrisma();
  const [payment, events] = await Promise.all([
    db.payment.findUnique({ where: { id }, select: { failureReason: true } }),
    db.paymentEvent.findMany({ where: { paymentId: id }, orderBy: { createdAt: "asc" }, select: { eventType: true, createdAt: true } }),
  ]);
  return { txn, failureReason: payment?.failureReason ?? null, events: events.map((e) => ({ type: e.eventType, at: e.createdAt.toISOString() })) };
}

export async function adminSubscriptions(demo: { customer: string; workspace: string; plan: string; status: string; billing: string; renewal: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.transactions.view");
  const rows = await getPrisma().subscription.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { organization: { select: { name: true, memberships: { where: { role: "OWNER" }, take: 1, include: { user: { select: { email: true } } } } } } } });
  return rows.map((s) => ({
    customer: s.organization.memberships[0]?.user.email ?? s.organization.name,
    workspace: s.organization.name,
    plan: title(s.plan),
    status: s.status === "ACTIVE" && s.currentPeriodEnd && s.currentPeriodEnd < new Date() ? "expired" : s.status.toLowerCase(),
    billing: "Prepaid 30 days",
    renewal: s.status === "ACTIVE" ? `Ends ${day(s.currentPeriodEnd)}` : "—",
  }));
}

// ---------------------------------------------------------------------------
// Operations: jobs, email, audit, integrations, health, alerts
// ---------------------------------------------------------------------------

export async function adminJobs(): Promise<(typeof mock.jobQueue)[number][]> {
  if (isDemo()) return mock.jobQueue;
  await requireAdmin("admin.jobs.manage");
  const db = getPrisma();
  const [active, recent] = await Promise.all([
    db.automationJob.findMany({ where: { status: { in: ["PENDING", "RUNNING", "FAILED"] } }, orderBy: [{ status: "asc" }, { runAt: "asc" }], take: 50 }),
    db.automationJob.findMany({ where: { status: "SUCCEEDED" }, orderBy: { completedAt: "desc" }, take: 20 }),
  ]);
  return [...active, ...recent].map((j) => ({
    name: j.type,
    queue: j.type.split(".")[0],
    status: j.status.toLowerCase(),
    scheduled: j.runAt.toISOString().replace("T", " ").slice(0, 16) + " UTC",
    retries: Math.max(0, j.attempts - 1),
  }));
}

export async function adminEmailStatus(demo: { name: string; status: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.integrations.manage");
  const db = getPrisma();
  const since = new Date(Date.now() - 86400e3);
  const [sent, failed, queued, skipped] = await Promise.all([
    db.emailLog.count({ where: { status: "SENT", sentAt: { gte: since } } }),
    db.emailLog.count({ where: { status: "FAILED", updatedAt: { gte: since } } }),
    db.emailLog.count({ where: { status: { in: ["QUEUED", "SENDING"] } } }),
    db.emailLog.count({ where: { status: "SKIPPED", createdAt: { gte: since } } }),
  ]);
  return [
    { name: "SMTP provider", status: smtpConfig() ? "Configured" : "Not configured" },
    { name: "Sent (24h)", status: String(sent) },
    { name: "Failed (24h)", status: String(failed) },
    { name: "Queued now", status: String(queued) },
    { name: "Skipped (24h)", status: String(skipped) },
  ];
}

export async function adminAudit(): Promise<(typeof mock.auditEvents)[number][]> {
  if (isDemo()) return mock.auditEvents;
  await requireAdmin("admin.audit.view");
  const rows = await getPrisma().auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { name: true, email: true } }, organization: { select: { name: true } } } });
  return rows.map((a) => ({
    id: a.id,
    actor: a.actor ? a.actor.name || a.actor.email : a.actorEmail ?? "system",
    action: a.action,
    target: [a.targetType, a.organization?.name].filter(Boolean).join(" · ") || "—",
    timestamp: a.createdAt.toISOString(),
  }));
}

export async function adminIntegrations(): Promise<(typeof mock.platformIntegrations)[number][]> {
  if (isDemo()) return mock.platformIntegrations;
  await requireAdmin("admin.integrations.manage");
  const db = getPrisma();
  const flw = flutterwaveConfig();
  const [lastPayment, lastWebhook, lastEmail, lastTick] = await Promise.all([
    db.payment.findFirst({ where: { status: "SUCCESSFUL" }, orderBy: { verifiedAt: "desc" }, select: { verifiedAt: true } }),
    db.paymentEvent.findFirst({ where: { eventType: { startsWith: "webhook.charge" } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.emailLog.findFirst({ where: { status: "SENT" }, orderBy: { sentAt: "desc" }, select: { sentAt: true } }),
    db.jobRun.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true } }),
  ]);
  const tickStale = !lastTick || Date.now() - lastTick.startedAt.getTime() > 20 * 60_000;
  return [
    { name: "Flutterwave", category: "Payment", status: !flw ? "not_configured" : flw.secretHash ? "healthy" : "degraded", mode: !flw ? "Disabled" : flw.testMode ? "Sandbox" : "Live", lastSuccess: ago(lastPayment?.verifiedAt) },
    { name: "Flutterwave webhooks", category: "Payment", status: flw?.secretHash ? "healthy" : "not_configured", mode: flw?.secretHash ? "Signed" : "Disabled", lastSuccess: ago(lastWebhook?.createdAt) },
    { name: "SMTP", category: "Email", status: smtpConfig() ? "healthy" : "not_configured", mode: smtpConfig() ? "Live" : "Disabled", lastSuccess: ago(lastEmail?.sentAt) },
    { name: "Supabase auth emails", category: "Email", status: hookSecrets().length ? "healthy" : "not_configured", mode: hookSecrets().length ? "Send Email Hook" : "Supabase default", lastSuccess: "—" },
    { name: "Scheduler (cron)", category: "Automation", status: !process.env.CRON_SECRET ? "not_configured" : tickStale ? "degraded" : "healthy", mode: process.env.CRON_SECRET ? "Enabled" : "Disabled", lastSuccess: ago(lastTick?.startedAt) },
  ];
}

export async function adminSystemHealth(): Promise<(typeof mock.systemHealth)[number][]> {
  if (isDemo()) return mock.systemHealth;
  await requireAdmin("admin.database.view");
  const db = getPrisma();
  const started = Date.now();
  let dbOk = true;
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  const latency = Date.now() - started;
  const since = new Date(Date.now() - 86400e3);
  const [failedJobs, lastRun, sent, failedEmails, rejectedWebhooks, unprocessed] = await Promise.all([
    db.automationJob.count({ where: { status: "FAILED", updatedAt: { gte: since } } }),
    db.jobRun.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true } }),
    db.emailLog.count({ where: { status: "SENT", sentAt: { gte: since } } }),
    db.emailLog.count({ where: { status: "FAILED", attempts: { gte: 5 }, updatedAt: { gte: since } } }),
    db.paymentEvent.count({ where: { eventType: "webhook.rejected", createdAt: { gte: since } } }),
    db.paymentEvent.count({ where: { processedAt: null, eventType: { startsWith: "webhook." }, createdAt: { lt: new Date(Date.now() - 10 * 60_000) } } }),
  ]);
  const deliveryRate = sent + failedEmails ? Math.round((sent / (sent + failedEmails)) * 1000) / 10 : null;
  return [
    { name: "Application", status: "Healthy", detail: `Responding (${process.env.VERCEL_ENV ?? process.env.NODE_ENV})` },
    { name: "PostgreSQL", status: dbOk ? (latency > 500 ? "Degraded" : "Healthy") : "Unavailable", detail: dbOk ? `Query round-trip ${latency} ms` : "Database unreachable" },
    { name: "Background jobs", status: !lastRun || Date.now() - lastRun.startedAt.getTime() > 20 * 60_000 ? "Degraded" : failedJobs ? "Degraded" : "Healthy", detail: `${failedJobs} failed in 24h · last run ${ago(lastRun?.startedAt)}` },
    { name: "Email delivery", status: !smtpConfig() ? "Unavailable" : failedEmails ? "Degraded" : "Healthy", detail: deliveryRate === null ? "No email in the last 24h" : `${deliveryRate}% delivered (24h)` },
    { name: "Webhook processing", status: unprocessed ? "Degraded" : "Healthy", detail: `${rejectedWebhooks} rejected signatures (24h) · ${unprocessed} stuck` },
  ];
}

/** Alerts derived from real system state (no invented incidents). */
export async function adminAlerts(): Promise<{ title: string; severity: string; time: string }[]> {
  if (isDemo()) return mock.adminNotifications;
  await requireAdmin("admin.dashboard.view");
  const db = getPrisma();
  const since = new Date(Date.now() - 86400e3);
  const alerts: { title: string; severity: string; time: string }[] = [];
  const [failedJob, failedEmail, mismatch, lastRun] = await Promise.all([
    db.automationJob.findFirst({ where: { status: "FAILED", updatedAt: { gte: since } }, orderBy: { updatedAt: "desc" } }),
    db.emailLog.findFirst({ where: { status: "FAILED", attempts: { gte: 5 }, updatedAt: { gte: since } }, orderBy: { updatedAt: "desc" } }),
    db.payment.findFirst({ where: { status: "FAILED", failureReason: { startsWith: "Amount/currency mismatch" } }, orderBy: { updatedAt: "desc" } }),
    db.jobRun.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true } }),
  ]);
  if (mismatch) alerts.push({ title: `Payment ${mismatch.txRef} held for review: amount/currency mismatch`, severity: "critical", time: ago(mismatch.updatedAt) });
  if (!lastRun || Date.now() - lastRun.startedAt.getTime() > 20 * 60_000) alerts.push({ title: "Scheduler hasn't run in the last 20 minutes (reminders paused)", severity: "warning", time: ago(lastRun?.startedAt) });
  if (failedJob) alerts.push({ title: `Automation job failed: ${failedJob.type}`, severity: "warning", time: ago(failedJob.updatedAt) });
  if (failedEmail) alerts.push({ title: `Email delivery failed permanently (${failedEmail.template})`, severity: "warning", time: ago(failedEmail.updatedAt) });
  if (!smtpConfig()) alerts.push({ title: "SMTP is not configured: emails are being skipped", severity: "critical", time: "now" });
  if (!flutterwaveConfig()) alerts.push({ title: "Flutterwave is not configured: paid webinars can't be published", severity: "info", time: "now" });
  return alerts;
}

export async function adminOverview() {
  if (isDemo()) {
    const m = mock.adminOverviewMetrics;
    return {
      cards: { users: m.totalUsers.toLocaleString(), workspaces: m.activeWorkspaces.toLocaleString(), platformRevenue: `NGN ${m.platformRevenue.toLocaleString()}`, webinarRevenue: `NGN ${m.webinarRevenue.toLocaleString()}`, failedPayments: String(m.failedPayments) },
      deliveryRate: `${m.deliveryRate}%`,
      failedJobs: m.failedAutomationJobs,
      chart: mock.monthlyPlatformChart,
      alerts: mock.adminNotifications,
      demo: true,
    };
  }
  await requireAdmin("admin.dashboard.view");
  const seesMoney = await adminCan("admin.transactions.view");
  const db = getPrisma();
  const since = new Date(Date.now() - 86400e3);
  const [users, workspaces, revenue, failedPayments, failedJobs, sent, failedEmails, alerts] = await Promise.all([
    db.user.count(),
    db.organization.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.payment.groupBy({ by: ["purpose", "currency"], where: { status: "SUCCESSFUL" }, _sum: { amount: true } }),
    db.payment.count({ where: { status: "FAILED" } }),
    db.automationJob.count({ where: { status: "FAILED" } }),
    db.emailLog.count({ where: { status: "SENT", sentAt: { gte: since } } }),
    db.emailLog.count({ where: { status: "FAILED", attempts: { gte: 5 }, updatedAt: { gte: since } } }),
    adminAlerts(),
  ]);
  const fmt = (purpose: string) =>
    !seesMoney ? "Restricted" : revenue.filter((r) => r.purpose === purpose).map((r) => money(Number(r._sum.amount ?? 0), r.currency)).join(" · ") || "0";
  const now = new Date();
  const months = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6 + i, 1)));
  const chart = await Promise.all(
    months.map(async (start, i) => {
      const end = months[i + 1] ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const [u, w, payments] = await Promise.all([
        db.user.count({ where: { createdAt: { gte: start, lt: end } } }),
        db.organization.count({ where: { createdAt: { gte: start, lt: end } } }),
        seesMoney ? db.payment.count({ where: { status: "SUCCESSFUL", verifiedAt: { gte: start, lt: end } } }) : Promise.resolve(0),
      ]);
      return { month: start.toLocaleString("en-US", { month: "short", timeZone: "UTC" }), users: u, workspaces: w, revenue: payments };
    }),
  );
  return {
    cards: { users: users.toLocaleString(), workspaces: workspaces.toLocaleString(), platformRevenue: fmt("PLATFORM_SUBSCRIPTION"), webinarRevenue: fmt("WEBINAR_TICKET"), failedPayments: seesMoney ? String(failedPayments) : "Restricted" },
    deliveryRate: sent + failedEmails ? `${Math.round((sent / (sent + failedEmails)) * 1000) / 10}%` : "—",
    failedJobs,
    chart,
    alerts,
    demo: false,
  };
}

// ---------------------------------------------------------------------------
// Configuration-backed pages
// ---------------------------------------------------------------------------

export async function adminPlans(demo: { name: string; price: string; status: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.dashboard.view");
  return Object.values(SAAS_PLANS).map((p) => ({ name: p.name, price: p.priceMonthly ? `$${p.priceMonthly} / 30 days` : "Free", status: "active" }));
}

export async function adminEntitlements(demo: { label: string; value: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.dashboard.view");
  const plans = Object.values(SAAS_PLANS);
  const firstWith = (pred: (e: (typeof plans)[number]["entitlements"]) => boolean) => plans.find((p) => pred(p.entitlements))?.name ?? "—";
  return [
    { label: "Paid webinars (ticket sales)", value: `${firstWith((e) => e.allowPaidWebinars)}+` },
    { label: "Evergreen / automated webinars", value: `${firstWith((e) => e.allowEvergreenAutomated)}+` },
    { label: "Custom domains", value: `${firstWith((e) => e.allowCustomDomains)}+` },
    { label: "Advanced automations", value: `${firstWith((e) => e.allowAdvancedAutomations)}+` },
    ...plans.map((p) => ({ label: `${p.name}: limits`, value: `${p.entitlements.maxWebinars >= 9999 ? "Unlimited" : p.entitlements.maxWebinars} webinars · ${p.entitlements.maxTeamMembers} members` })),
  ];
}

export async function adminAdministrators(demo: { name: string; role: string; email: string; status: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.admins.manage");
  const rows = await getPrisma().platformAdmin.findMany({ orderBy: { createdAt: "asc" }, include: { user: { select: { name: true, email: true, status: true } } } });
  return rows.map((a) => ({ name: a.user.name || a.user.email, role: title(a.role), email: a.user.email, status: a.revokedAt ? "revoked" : a.user.status.toLowerCase() }));
}

export async function adminAutomations(demo: { name: string; trigger: string; status: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.jobs.manage");
  const rows = await getPrisma().automationJob.groupBy({ by: ["type", "status"], _count: { _all: true } });
  const types = [...new Set(rows.map((r) => r.type))].sort();
  return types.map((type) => {
    const failed = rows.find((r) => r.type === type && r.status === "FAILED")?._count._all ?? 0;
    const done = rows.find((r) => r.type === type && r.status === "SUCCEEDED")?._count._all ?? 0;
    return { name: type, trigger: type.startsWith("notification") ? "Registrant schedule" : "Scheduler tick", status: failed ? `${failed} failed · ${done} ok` : `active · ${done} ok` };
  });
}

export async function adminDomains(demo: { domain: string; status: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.workspaces.view");
  const rows = await getPrisma().organization.findMany({ where: { customDomain: { not: null } }, select: { customDomain: true } });
  return [{ domain: (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "") || "—", status: "primary" }, ...rows.map((r) => ({ domain: r.customDomain!, status: "not verified (custom domains aren't live yet)" }))];
}

export async function adminSettings(demo: { section: string; value: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.settings.manage");
  const flw = flutterwaveConfig();
  return [
    { section: "General", value: `App URL ${process.env.NEXT_PUBLIC_APP_URL ?? "not set"}` },
    { section: "Registration", value: "Supabase Auth: email confirmation required before sign-in" },
    { section: "Email", value: smtpConfig() ? "SMTP configured (server environment)" : "SMTP not configured" },
    { section: "Payments", value: !flw ? "Flutterwave not configured" : flw.testMode ? "Flutterwave sandbox (test key)" : "Flutterwave live" },
    { section: "Security", value: "HTTP-only session cookies, per-tenant authorization, rate limiting, audit log" },
  ];
}

export async function adminStorage(demo: { name: string; value: string }[]) {
  if (isDemo()) return demo;
  await requireAdmin("admin.database.view");
  return [
    { name: "Storage provider", value: "None: webinar videos are hosted externally (YouTube, Vimeo, …)" },
    { name: "Uploads", value: "Not enabled" },
  ];
}

export async function adminDatabase() {
  if (isDemo()) return { connectivity: "Healthy", provider: "PostgreSQL", migrations: "Up to date" };
  await requireAdmin("admin.database.view");
  const db = getPrisma();
  try {
    const rows = await db.$queryRaw<{ n: number; last: string | null }[]>`SELECT count(*)::int AS n, max(migration_name) AS last FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    return { connectivity: "Healthy", provider: "PostgreSQL (Supabase)", migrations: rows[0]?.last ? `${rows[0].n} applied · latest ${rows[0].last}` : "No migration history" };
  } catch {
    return { connectivity: "Unavailable", provider: "PostgreSQL (Supabase)", migrations: "Unknown" };
  }
}

/** Features without a backend yet show an honest empty state instead of sample rows. */
export async function notYetAvailable<T>(demo: T[]): Promise<{ rows: T[]; unavailable: boolean }> {
  if (isDemo()) return { rows: demo, unavailable: false };
  await requireAdmin("admin.dashboard.view");
  return { rows: [], unavailable: true };
}
