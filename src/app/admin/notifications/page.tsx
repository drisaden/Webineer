import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { adminAlerts } from "@/server/admin/data";
import { getAuthMode } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const demoNotifications = [
  { title: "Database pool saturation", severity: "warning" },
  { title: "Webhook retries", severity: "info" },
  { title: "Failed nightly backup", severity: "critical" },
];

export default async function AdminNotificationsPage() {
  const notifications = getAuthMode() === "demo" ? demoNotifications : await adminAlerts();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Notifications</h2>
          <p className="text-sm text-secondaryText">Administrative alerts and escalation state</p>
        </div>
        <Badge label={`${notifications.length} open`} tone="warning" />
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
