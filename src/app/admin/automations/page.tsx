import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const automations = [
  { name: "Welcome sequence", trigger: "New registration", status: "active" },
  { name: "24-hour reminder", trigger: "Scheduled webinar", status: "active" },
  { name: "Failed payment follow-up", trigger: "Transaction state", status: "paused" },
];

export default function AdminAutomationsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Automations</h2>
          <p className="text-sm text-secondaryText">Workflow health and operational state</p>
        </div>
        <Badge label="2 active" tone="success" />
      </div>

      <div className="divide-y divide-border">
        {automations.map((item) => (
          <div key={item.name} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="font-medium text-primaryText">{item.name}</div>
              <div className="text-sm text-secondaryText">{item.trigger}</div>
            </div>
            <Badge label={item.status} tone={item.status === "active" ? "success" : "warning"} />
          </div>
        ))}
      </div>
    </Card>
  );
}
