import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { initialWorkflows } from "@/services/automation-engine";

export default function EmailAutomationsPage() {
  return (
    <DashboardShell title="Email Automation Rules">
      <div className="space-y-6">
        {initialWorkflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{workflow.name}</h3>
                <Badge label={workflow.enabled ? "Active" : "Paused"} tone={workflow.enabled ? "success" : "warning"} />
              </div>
              <p className="text-sm text-secondaryText">{workflow.description}</p>
              <div className="flex flex-wrap gap-2">
                {workflow.steps.map((step) => (
                  <span key={step.id} className="rounded-full border border-border bg-[#F7F9FC] px-2.5 py-1 text-[11px] font-medium text-secondaryText">
                    {step.type === "action" ? step.actionType : step.type}
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
