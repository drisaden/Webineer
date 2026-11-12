import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const connectors = [
  { category: "Video", name: "YouTube / Vimeo", status: "Connected", description: "External video-first webinar sources remain modular and provider-specific." },
  { category: "Email", name: "Development email log", status: "Active", description: "All outgoing notifications are queued in a local log unless SMTP or a transactional provider is configured." },
  { category: "Payments", name: "Paystack + Flutterwave", status: "Test mode", description: "Ready for secure verification and webhook processing with no live keys required." },
  { category: "Calendar", name: "ICS calendar export", status: "Available", description: "Registration flows can generate reminders for attendee calendars." },
  { category: "Webhooks", name: "Outgoing dispatch", status: "Protected", description: "Signed payloads, retry handling, and private-IP protection remain in place." },
];

export default function IntegrationsPage() {
  return (
    <DashboardShell title="Integrations">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Link href="/dashboard/settings/payments" className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-[#EEF2F7]">
            Configure payments <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {connectors.map((connector) => (
            <Card key={connector.name}>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-secondaryText">{connector.category}</span>
                  <Badge label={connector.status} tone={connector.status === "Connected" || connector.status === "Active" ? "success" : "info"} />
                </div>
                <h3 className="text-lg font-semibold">{connector.name}</h3>
                <p className="text-sm text-secondaryText">{connector.description}</p>
                <div className="flex items-center gap-2 text-sm font-medium text-[#17294B]">
                  <CheckCircle2 className="h-4 w-4 text-[#16A36A]" /> Ready for setup
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </DashboardShell>
  );
}
