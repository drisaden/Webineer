import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, Mail, Send } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthMode } from "@/lib/supabase/config";
import { getEmailLogs } from "@/providers/email";
import { standardEmailTemplates } from "@/providers/email/templates";
import { getAppSession } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";
import { smtpConfig } from "@/server/email/smtp";

export const dynamic = "force-dynamic";

interface LogView {
  id: string;
  template: string;
  status: string;
  name: string;
  email: string;
  subject: string;
  at: string;
  error?: string | null;
  attempts?: number;
}

const tone = (status: string) => (status === "sent" ? "success" : status === "failed" || status === "skipped" ? "warning" : "info");

async function loadLogs(): Promise<{ demo: boolean; status: string; total: number; logs: LogView[] } | null> {
  if (getAuthMode() !== "supabase") {
    const logs = getEmailLogs();
    return {
      demo: true,
      status: "Simulated",
      total: logs.length,
      logs: logs.slice(0, 5).map((l) => ({ id: l.id, template: l.templateType, status: l.status, name: l.recipientName, email: l.recipientEmail, subject: l.subject, at: l.timestamp })),
    };
  }
  const app = await getAppSession();
  if (!app) return null;
  const db = getPrisma();
  const where = { organizationId: app.organization.id };
  const [total, rows] = await Promise.all([
    db.emailLog.count({ where }),
    db.emailLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, template: true, status: true, toName: true, toEmail: true, subject: true, createdAt: true, sentAt: true, lastError: true, attempts: true } }),
  ]);
  return {
    demo: false,
    status: smtpConfig() ? "SMTP connected" : "SMTP not configured",
    total,
    logs: rows.map((r) => ({ id: r.id, template: r.template, status: r.status.toLowerCase(), name: r.toName ?? "", email: r.toEmail, subject: r.subject, at: (r.sentAt ?? r.createdAt).toISOString(), error: r.lastError, attempts: r.attempts })),
  };
}

export default async function EmailsPage() {
  const data = await loadLogs();
  if (!data) redirect("/login?next=/dashboard/emails");
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
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Logged sends</span><BellRing className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{data.total}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Status</span><Send className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{data.status}</p></Card>
        </section>

        <Card>
          <CardContent className="space-y-4">
            {data.logs.length === 0 && <p className="text-sm text-secondaryText">No emails sent yet. Confirmations, receipts and reminders will appear here.</p>}
            {data.logs.map((log) => (
              <div key={log.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{log.template}</h3>
                    <Badge label={log.status} tone={log.status === "simulated" ? "info" : tone(log.status)} />
                  </div>
                  <p className="mt-1 text-sm text-secondaryText">{log.name} &lt;{log.email}&gt;</p>
                  {log.error && log.status !== "sent" && <p className="mt-1 text-xs text-[#B87514]">{log.error}{log.attempts ? ` · attempt ${log.attempts}` : ""}</p>}
                </div>
                <div className="text-sm text-secondaryText">
                  <p>{log.subject}</p>
                  <p>{new Date(log.at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
