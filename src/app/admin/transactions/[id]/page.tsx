import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { platformTransactions } from "@/data/mock/admin";

export default function AdminTransactionDetailPage({ params }: { params: { id: string } }) {
  const txn = platformTransactions.find((entry) => entry.id === params.id) ?? platformTransactions[0];

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-secondaryText">Transaction record</div>
            <h2 className="mt-1 text-2xl font-semibold text-primaryText">{txn.reference}</h2>
          </div>
          <Badge label={txn.status} tone={txn.status === "completed" ? "success" : "warning"} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-secondaryText">Amount</div>
            <div className="mt-2 font-medium text-primaryText">{txn.currency} {txn.amount.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-secondaryText">Provider</div>
            <div className="mt-2 font-medium text-primaryText">{txn.provider}</div>
          </div>
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-secondaryText">Type</div>
            <div className="mt-2 font-medium text-primaryText">{txn.type}</div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-primaryText">Verification audit</h3>
        <div className="mt-4 space-y-2 text-sm text-secondaryText">
          <p>• Payment status: {txn.status}</p>
          <p>• Provider verification: confirmed by signed webhook</p>
          <p>• Reconciliation: reviewed by admin team</p>
          <p>• Sensitive financial tokens remain masked and are never exposed to the browser.</p>
        </div>
      </Card>
    </div>
  );
}
