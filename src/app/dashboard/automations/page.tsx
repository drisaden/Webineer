import { CheckCircle2, Clock3, PlayCircle, Workflow } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { initialWorkflows } from "@/services/automation-engine";

export default function AutomationsPage() {
  return (
    <DashboardShell title="Automation Studio">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-secondaryText">Event-driven webinar orchestration</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard/emails/automations">Reminder sequencing</Link>
            </Button>
            <Button size="sm">New automation</Button>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Enabled</span><PlayCircle className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{initialWorkflows.filter((flow) => flow.enabled).length}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Runs today</span><Workflow className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">224</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Pending queue</span><Clock3 className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">19</p></Card>
        </section>

        <Card>
          <CardContent className="space-y-5">
            {initialWorkflows.map((workflow) => (
              <div key={workflow.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{workflow.name}</h3>
                      <Badge label={workflow.enabled ? "Active" : "Paused"} tone={workflow.enabled ? "success" : "warning"} />
                    </div>
                    <p className="mt-1 text-sm text-secondaryText">{workflow.description}</p>
                  </div>
                  <div className="text-sm text-secondaryText">Trigger: <span className="font-medium text-primaryText">{workflow.trigger}</span></div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {workflow.steps.map((step, index) => (
                    <span key={step.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-[#F7F9FC] px-2.5 py-1 text-xs font-medium text-secondaryText">
                      {index + 1}. {step.type === "action" ? step.actionType : step.type}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-secondaryText">
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A36A]" /> {workflow.executionCount} executions</span>
                  <span>Updated {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
