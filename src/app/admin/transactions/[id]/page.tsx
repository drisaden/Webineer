import { formatDateTime } from "@/lib/datetime";
import { DISPLAY_TZ } from "@/lib/display-timezone";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { adminTransaction } from "@/server/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminTransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { txn, failureReason, events } = await adminTransaction(id);

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
          {failureReason && <p>• Reason: {failureReason}</p>}
          {events.length > 0 ? events.map((e, i) => <p key={i}>• {e.type} · {formatDateTime(e.at, DISPLAY_TZ)}</p>) : <p>• Verified server-side with the provider before any access is granted.</p>}
          <p>• Sensitive financial tokens remain masked and are never exposed to the browser.</p>
        </div>
      </Card>
    </div>
  );
}
