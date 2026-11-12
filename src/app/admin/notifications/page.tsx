import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const notifications = [
  { title: "Database pool saturation", severity: "warning" },
  { title: "Webhook retries", severity: "info" },
  { title: "Failed nightly backup", severity: "critical" },
];

export default function AdminNotificationsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Notifications</h2>
          <p className="text-sm text-secondaryText">Administrative alerts and escalation state</p>
        </div>
        <Badge label="3 open" tone="warning" />
      </div>

      <div className="divide-y divide-border">
        {notifications.map((alert) => (
          <div key={alert.title} className="flex items-center justify-between px-5 py-4">
            <div className="font-medium text-primaryText">{alert.title}</div>
            <Badge label={alert.severity} tone={alert.severity === "critical" ? "warning" : "info"} />
          </div>
        ))}
      </div>
    </Card>
  );
}
