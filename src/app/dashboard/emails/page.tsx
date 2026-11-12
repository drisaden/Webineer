import Link from "next/link";
import { BellRing, Mail, Send } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEmailLogs } from "@/providers/email";
import { standardEmailTemplates } from "@/providers/email/templates";

const recentLogs = getEmailLogs().slice(0, 5);

export default function EmailsPage() {
  return (
    <DashboardShell title="Email Operations">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-secondaryText">Provider-aware communication layer</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard/emails/templates">Templates</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard/emails/campaigns">Campaigns</Link>
            </Button>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Templates</span><Mail className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{standardEmailTemplates.length}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Logged sends</span><BellRing className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{recentLogs.length}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Status</span><Send className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">Simulated</p></Card>
        </section>

        <Card>
          <CardContent className="space-y-4">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{log.templateType}</h3>
                    <Badge label={log.status} tone={log.status === "simulated" ? "info" : log.status === "failed" ? "warning" : "success"} />
                  </div>
                  <p className="mt-1 text-sm text-secondaryText">{log.recipientName} &lt;{log.recipientEmail}&gt;</p>
                </div>
                <div className="text-sm text-secondaryText">
                  <p>{log.subject}</p>
                  <p>{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
