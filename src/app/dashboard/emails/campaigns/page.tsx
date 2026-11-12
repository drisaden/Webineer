import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const campaigns = [
  { id: "camp_001", name: "Launch reminder sequence", audience: "Registered attendees", scheduled: "2026-11-18 17:00", status: "Scheduled", recipients: 368 },
  { id: "camp_002", name: "Replay and conversion follow-up", audience: "Missed webinar viewers", scheduled: "2026-11-12 09:00", status: "Running", recipients: 182 },
  { id: "camp_003", name: "VIP upsell sequence", audience: "Ticket buyers", scheduled: "2026-11-09 07:00", status: "Sent", recipients: 96 },
];

export default function EmailCampaignsDetailPage() {
  return (
    <DashboardShell title="Email Campaigns">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{campaign.name}</h3>
                    <Badge label={campaign.status} tone={campaign.status === "Sent" ? "success" : "info"} />
                  </div>
                  <p className="mt-1 text-sm text-secondaryText">{campaign.audience}</p>
                </div>
                <div className="text-sm text-secondaryText">
                  <div>{campaign.scheduled}</div>
                  <div>{campaign.recipients} recipients</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
