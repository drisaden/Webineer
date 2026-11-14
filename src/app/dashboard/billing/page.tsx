import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getPrisma } from "@/server/db/prisma";
import { getAppSession } from "@/server/auth/session";
import { getBillingData } from "@/server/billing";
import { billingService, SAAS_PLANS } from "@/services/billing-entitlements";

export const dynamic = "force-dynamic";

const PAYMENT_NOTICES: Record<string, { tone: "success" | "info" | "danger"; text: string }> = {
  success: { tone: "success", text: "Payment confirmed. Your plan is active." },
  pending: { tone: "info", text: "Your payment is still processing. Your plan will update as soon as Flutterwave confirms it." },
  failed: { tone: "danger", text: "We couldn't confirm that payment. You haven't been charged for a plan change." },
};

async function liveUsage(organizationId: string) {
  const db = getPrisma();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [webinars, registrants, members] = await Promise.all([
    db.webinar.count({ where: { organizationId, deletedAt: null } }),
    db.registration.count({ where: { organizationId, registeredAt: { gte: monthStart }, status: { not: "CANCELLED" } } }),
    db.membership.count({ where: { organizationId, status: "ACTIVE" } }),
  ]);
  return { webinars, registrants, members };
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const query = await searchParams;
  const data = await getBillingData();
  if (!data) redirect("/login?next=/dashboard/billing");
  const demo = data.mode === "demo";
  const currentKey = demo ? billingService.getCurrentPlan().planKey : data.currentPlan;
  const current = SAAS_PLANS[currentKey as keyof typeof SAAS_PLANS];
  const limits = current.entitlements;
  const app = demo ? null : await getAppSession();
  const usage = demo
    ? (() => {
        const u = billingService.getUsageMetrics();
        return { webinars: u.webinarsUsed, registrants: u.registrantsThisMonth, members: u.teamMembersCount, domains: u.customDomainsActive };
      })()
    : { ...(await liveUsage(app!.organization.id)), domains: 0 };
  const notice = query.payment ? PAYMENT_NOTICES[query.payment] : undefined;

  return (
    <DashboardShell title="Billing & Entitlements">
      <div className="space-y-6">
        {notice && (
          <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === "success" ? "border-[#BDEBD6] bg-[#EAFBF5] text-[#11724B]" : notice.tone === "danger" ? "border-[#F5D7D7] bg-[#FFF6F6] text-[#B33A3A]" : "border-border bg-white text-secondaryText"}`}>
            {notice.text}
          </div>
        )}
        <Card className="p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-secondaryText">Current plan</p>
              <h2 className="text-2xl font-semibold">{current.name}</h2>
            </div>
            {demo ? <Badge label="Local billing adapter" tone="info" /> : data.testMode ? <Badge label="Flutterwave test mode" tone="warning" /> : <Badge label="Flutterwave" tone="success" />}
          </div>
          <p className="mt-3 text-sm text-secondaryText">
            {demo
              ? "This workspace is using a simulated billing adapter. No real subscription payment is processed without a configured provider."
              : data.periodEnd
                ? `Paid through ${new Date(data.periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Plans are prepaid in 30-day periods; buying the same plan again extends it.`
                : "Plans are prepaid in 30-day periods and paid securely through Flutterwave."}
          </p>
          {!demo && !data.paymentsReady && <p className="mt-2 text-sm text-[#B33A3A]">Online payments aren&apos;t configured on this site yet.</p>}
        </Card>

        <section className="grid gap-4 xl:grid-cols-4">
          {Object.entries(SAAS_PLANS).map(([key, plan]) => (
            <Card key={key} className={key === currentKey ? "border-[#16D6B2] bg-[#EAFBF5]" : ""}>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {key === currentKey && <Badge label="Active" tone="success" />}
                </div>
                <div className="text-3xl font-semibold">${plan.priceMonthly}<span className="text-base font-normal text-secondaryText">/mo</span></div>
                <p className="text-sm text-secondaryText">{plan.description}</p>
                <ul className="space-y-2 text-sm text-secondaryText">
                  {Object.entries(plan.entitlements).slice(0, 5).map(([name, value]) => (
                    <li key={name} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A36A]" />
                      <span>{name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}: {String(value)}</span>
                    </li>
                  ))}
                </ul>
                {!demo && plan.priceMonthly > 0 && data.canManageBilling && data.paymentsReady && (
                  <UpgradeButton plan={key} label={key === currentKey ? "Extend 30 days" : `Switch to ${plan.name}`} />
                )}
              </CardContent>
            </Card>
          ))}
        </section>
        {!demo && !data.canManageBilling && <p className="text-sm text-secondaryText">Only workspace owners can change the plan.</p>}

        <Card className="p-5">
          <h3 className="text-lg font-semibold">Usage</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div><p className="text-sm text-secondaryText">Webinars used</p><p className="text-2xl font-semibold">{usage.webinars}/{limits.maxWebinars}</p></div>
            <div><p className="text-sm text-secondaryText">Registrants</p><p className="text-2xl font-semibold">{usage.registrants}</p></div>
            <div><p className="text-sm text-secondaryText">Team members</p><p className="text-2xl font-semibold">{usage.members}/{limits.maxTeamMembers}</p></div>
            <div><p className="text-sm text-secondaryText">Custom domains</p><p className="text-2xl font-semibold">{usage.domains}</p></div>
          </div>
        </Card>

        {!demo && data.history.length > 0 && (
          <Card className="p-5">
            <h3 className="text-lg font-semibold">Billing history</h3>
            <ul className="mt-4 divide-y divide-border text-sm">
              {data.history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-primaryText">{h.description}</span>
                  <span className="text-secondaryText">{new Date(h.date).toLocaleDateString("en-GB")}</span>
                  <span className="font-medium text-primaryText">{h.amount}</span>
                  <Badge label={h.status} tone={h.status === "successful" ? "success" : h.status === "pending" ? "info" : "warning"} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
