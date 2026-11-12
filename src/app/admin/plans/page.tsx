import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const plans = [
  { name: "Free", price: "NGN 0", status: "active" },
  { name: "Starter", price: "NGN 12,500", status: "active" },
  { name: "Professional", price: "NGN 35,000", status: "active" },
  { name: "Business", price: "NGN 90,000", status: "active" },
];

export default function AdminPlansPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Plans & Entitlements</h2>
          <p className="text-sm text-secondaryText">Configured Webineer SaaS plans and customer offering limits</p>
        </div>
        <Badge label="4 plans" tone="info" />
      </div>

      <div className="divide-y divide-border">
        {plans.map((plan) => (
          <div key={plan.name} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="font-medium text-primaryText">{plan.name}</div>
              <div className="text-sm text-secondaryText">{plan.price}</div>
            </div>
            <Badge label={plan.status} tone={plan.status === "active" ? "success" : "warning"} />
          </div>
        ))}
      </div>
    </Card>
  );
}
