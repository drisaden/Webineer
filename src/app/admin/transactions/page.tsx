import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { platformTransactions } from "@/data/mock/admin";

export default function AdminTransactionsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Transactions</h2>
          <p className="text-sm text-secondaryText">Subscription and webinar payment records</p>
        </div>
        <Badge label="Revenue separated" tone="info" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F7F9FC] text-secondaryText">
            <tr>
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 font-medium">Provider</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {platformTransactions.map((txn) => (
              <tr key={txn.id} className="border-t border-border">
                <td className="px-5 py-4 text-primaryText">{txn.reference}</td>
                <td className="px-5 py-4 text-secondaryText">{txn.provider}</td>
                <td className="px-5 py-4 text-secondaryText">{txn.customer}</td>
                <td className="px-5 py-4 text-secondaryText">{txn.type}</td>
                <td className="px-5 py-4 text-secondaryText">{txn.currency} {txn.amount.toLocaleString()}</td>
                <td className="px-5 py-4"><Badge label={txn.status} tone={txn.status === "completed" ? "success" : "warning"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
