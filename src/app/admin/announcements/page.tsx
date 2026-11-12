import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const announcements = [
  { title: "Platform maintenance notice", audience: "All users", status: "scheduled" },
  { title: "New webinar features rollout", audience: "Business plans", status: "published" },
  { title: "Security update", audience: "Administrators", status: "draft" },
];

export default function AdminAnnouncementsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Announcements</h2>
          <p className="text-sm text-secondaryText">Platform communication management and scheduling</p>
        </div>
        <Badge label="3 drafts" tone="info" />
      </div>

      <div className="divide-y divide-border">
        {announcements.map((announcement) => (
          <div key={announcement.title} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="font-medium text-primaryText">{announcement.title}</div>
              <div className="text-sm text-secondaryText">{announcement.audience}</div>
            </div>
            <Badge label={announcement.status} tone={announcement.status === "published" ? "success" : "warning"} />
          </div>
        ))}
      </div>
    </Card>
  );
}
