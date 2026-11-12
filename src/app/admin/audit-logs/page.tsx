import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auditEvents } from "@/data/mock/admin";

export default function AdminAuditLogsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Audit logs</h2>
          <p className="text-sm text-secondaryText">Administrative activity and system actions</p>
        </div>
        <Badge label="Immutable by default" tone="info" />
      </div>

      <div className="divide-y divide-border">
        {auditEvents.map((event) => (
          <div key={event.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-primaryText">{event.action}</div>
              <Badge label="Logged" tone="success" />
            </div>
            <div className="mt-2 text-sm text-secondaryText">
              Actor: {event.actor} · Target: {event.target}
            </div>
            <div className="mt-1 text-xs text-secondaryText">{event.timestamp}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
