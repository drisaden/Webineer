import { CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { billingService, SAAS_PLANS } from "@/services/billing-entitlements";

export default function BillingPage() {
  const currentPlan = billingService.getCurrentPlan();
  const usage = billingService.getUsageMetrics();

  return (
    <DashboardShell title="Billing & Entitlements">
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-secondaryText">Current plan</p>
              <h2 className="text-2xl font-semibold">{currentPlan.name}</h2>
            </div>
            <Badge label="Local billing adapter" tone="info" />
          </div>
          <p className="mt-3 text-sm text-secondaryText">This workspace is using a simulated billing adapter. No real subscription payment is processed without a configured provider.</p>
        </Card>

        <section className="grid gap-4 xl:grid-cols-4">
          {Object.entries(SAAS_PLANS).map(([key, plan]) => (
            <Card key={key} className={key === currentPlan.planKey ? "border-[#16D6B2] bg-[#EAFBF5]" : ""}>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {key === currentPlan.planKey && <Badge label="Active" tone="success" />}
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
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="p-5">
          <h3 className="text-lg font-semibold">Usage</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div><p className="text-sm text-secondaryText">Webinars used</p><p className="text-2xl font-semibold">{usage.webinarsUsed}/{usage.webinarsLimit}</p></div>
            <div><p className="text-sm text-secondaryText">Registrants</p><p className="text-2xl font-semibold">{usage.registrantsThisMonth}</p></div>
            <div><p className="text-sm text-secondaryText">Team members</p><p className="text-2xl font-semibold">{usage.teamMembersCount}/{usage.teamMembersLimit}</p></div>
            <div><p className="text-sm text-secondaryText">Custom domains</p><p className="text-2xl font-semibold">{usage.customDomainsActive}</p></div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
