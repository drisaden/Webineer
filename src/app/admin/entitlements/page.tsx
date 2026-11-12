import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const entitlements = [
  { label: "Unlimited webinars", value: "Business" },
  { label: "Automation workflows", value: "Professional+" },
  { label: "Custom domains", value: "Professional+" },
  { label: "Advanced analytics", value: "Business" },
];

export default function AdminEntitlementsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Entitlements</h2>
          <p className="text-sm text-secondaryText">Platform feature access by plan</p>
        </div>
        <Badge label="4 rules" tone="info" />
      </div>

      <div className="divide-y divide-border">
        {entitlements.map((item) => (
          <div key={item.label} className="flex items-center justify-between px-5 py-4">
            <div className="font-medium text-primaryText">{item.label}</div>
            <Badge label={item.value} tone="success" />
          </div>
        ))}
      </div>
    </Card>
  );
}
