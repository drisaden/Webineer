import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { standardEmailTemplates } from "@/providers/email/templates";

export default function EmailTemplatesPage() {
  return (
    <DashboardShell title="Email Templates">
      <div className="space-y-6">
        <div className="text-sm text-secondaryText">System templates include registration confirmations, reminders, replay notices, follow-ups, and purchase receipts.</div>
        <section className="grid gap-4 lg:grid-cols-2">
          {standardEmailTemplates.map((template) => (
            <Card key={template.id}>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  <Badge label={template.type} tone="info" />
                </div>
                <p className="text-sm text-secondaryText">{template.subject}</p>
                <div className="flex flex-wrap gap-2">
                  {template.variables.map((variable) => (
                    <span key={`${variable}-${template.id}`} className="rounded-full border border-border bg-[#F7F9FC] px-2.5 py-1 text-[11px] font-medium text-secondaryText">{"{{" + variable + "}}"}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </DashboardShell>
  );
}
