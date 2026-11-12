import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const subscriptions = [
  { customer: "Northstar Studio", workspace: "Northstar Studio", plan: "Business", status: "active", billing: "Monthly", renewal: "2026-12-01" },
  { customer: "MentorLoop AI", workspace: "MentorLoop AI", plan: "Enterprise", status: "trial", billing: "Annual", renewal: "2026-11-30" },
  { customer: "LaunchRoom", workspace: "LaunchRoom", plan: "Starter", status: "paused", billing: "Monthly", renewal: "2026-12-15" },
];

export default function AdminSubscriptionsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Subscriptions</h2>
          <p className="text-sm text-secondaryText">Platform subscription lifecycle and plan state</p>
        </div>
        <Badge label="3 active" tone="success" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F7F9FC] text-secondaryText">
            <tr>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Workspace</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Billing</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((entry, index) => (
              <tr key={`${entry.customer}-${index}`} className="border-t border-border">
                <td className="px-5 py-4 text-primaryText">{entry.customer}</td>
                <td className="px-5 py-4 text-secondaryText">{entry.workspace}</td>
                <td className="px-5 py-4 text-secondaryText">{entry.plan}</td>
                <td className="px-5 py-4 text-secondaryText">{entry.billing}</td>
                <td className="px-5 py-4"><Badge label={entry.status} tone={entry.status === "active" ? "success" : "warning"} /></td>
                <td className="px-5 py-4 text-secondaryText">{entry.renewal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
