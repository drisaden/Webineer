import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { getAutomationOverview } from "@/server/jobs/overview";

export const dynamic = "force-dynamic";

export default async function EmailAutomationsPage() {
  const data = await getAutomationOverview();
  if (!data) redirect("/login?next=/dashboard/emails/automations");
  return (
    <DashboardShell title="Email Automation Rules">
      <div className="space-y-6">
        {data.workflows.length === 0 && <p className="text-sm text-secondaryText">Publish a webinar with reminders or follow-ups to see its email rules here.</p>}
        {data.workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{workflow.name}</h3>
                <Badge label={workflow.enabled ? "Active" : "Paused"} tone={workflow.enabled ? "success" : "warning"} />
              </div>
              <p className="text-sm text-secondaryText">{workflow.description}</p>
              <div className="flex flex-wrap gap-2">
                {workflow.steps.map((step, index) => (
                  <span key={`${step}-${index}`} className="rounded-full border border-border bg-[#F7F9FC] px-2.5 py-1 text-[11px] font-medium text-secondaryText">
                    {step}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
