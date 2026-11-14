import { CalendarClock, CheckCheck, Send } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEmailActivity, isDemoMode } from "@/server/workspace-pages";

export const dynamic = "force-dynamic";

const demoCampaigns = [
  { id: "cmp_01", name: "Reminder Sequence: Product Launch", webinar: "Scaling a Creator Business Without Burnout", audience: "Registered attendees", status: "Scheduled", scheduledFor: "2026-11-18 17:00", sent: 368 },
  { id: "cmp_02", name: "Replay Follow-up", webinar: "Course Launch Blueprint", audience: "Missed webinar viewers", status: "Sending", scheduledFor: "2026-11-12 09:00", sent: 182 },
  { id: "cmp_03", name: "VIP Offer Email", webinar: "Weekly Lead Generation Clinic", audience: "Ticket purchasers", status: "Sent", scheduledFor: "2026-11-09 07:00", sent: 96 },
];

export default async function EmailCampaignsPage() {
  const demo = isDemoMode();
  const campaigns = demo ? demoCampaigns : [];
  const activity = demo ? { queued: 12, delivered: 1298, nextSend: "Today" } : ((await getEmailActivity()) ?? { queued: 0, delivered: 0, nextSend: "—" });
  return (
    <DashboardShell title="Email Campaigns">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-secondaryText">Lifecycle communication workflows</p>
          </div>
          {demo && <Button variant="primary" size="sm">Create campaign</Button>}
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Queued</span><Send className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{activity.queued}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Delivered</span><CheckCheck className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{activity.delivered.toLocaleString()}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Next send</span><CalendarClock className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{activity.nextSend}</p></Card>
        </section>

        <Card>
          <CardContent className="space-y-4">
            {!demo && <p className="text-sm text-secondaryText">One-off campaigns aren&apos;t available yet. Confirmations, reminders, replay and follow-up emails are set per webinar in its Notifications section; the numbers above are their real delivery activity.</p>}
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{campaign.name}</h3>
                    <Badge label={campaign.status} tone={campaign.status === "Sent" ? "success" : "info"} />
                  </div>
                  <p className="mt-1 text-sm text-secondaryText">{campaign.webinar} · {campaign.audience}</p>
                </div>
                <div className="text-sm text-secondaryText">
                  <div>Scheduled: {campaign.scheduledFor}</div>
                  <div>{campaign.sent} recipients</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
