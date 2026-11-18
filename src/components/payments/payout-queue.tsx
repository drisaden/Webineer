"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";

interface Row { id: string; workspace: string; amount: number; currency: string; status: string; createdAt: string; bankName: string; accountNumber: string; accountName: string; reference: string | null; note: string | null }
const TONE: Record<string, "success" | "warning" | "info" | "default"> = { REQUESTED: "info", APPROVED: "info", PAID: "success", REJECTED: "warning", CANCELLED: "default" };

export function PayoutQueue({ rows, feePercent, holdDays }: { rows: Row[]; feePercent: number; holdDays: number }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [msg, setMsg] = useState<string | null>(null);
  const [fee, setFee] = useState(String(feePercent));
  const [hold, setHold] = useState(String(holdDays));
  const shown = rows.filter((r) => filter === "all" || r.status === "REQUESTED" || r.status === "APPROVED");

  async function act(id: string, action: "approve" | "paid" | "reject") {
    let extra: Record<string, string> = {};
    if (action === "paid") { const reference = window.prompt("Transfer reference from your bank"); if (!reference) return; extra = { reference }; }
    if (action === "reject") { const note = window.prompt("Why is this being declined? The host will see this."); if (!note) return; extra = { note }; }
    const res = await fetch(`/api/admin/payouts/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
    const body = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Updated." : body.error ?? "That didn't work.");
    router.refresh();
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/payout-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feePercent: Number(fee), holdDays: Number(hold) }) });
    const body = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Settings saved. They apply to new sales." : body.error ?? "Those values aren't valid.");
    router.refresh();
  }

  return (
    <div className="space-y-5" data-testid="payout-queue">
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Fees and payout timing</h2>
        <form onSubmit={saveSettings} className="mt-3 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">Platform fee (%)<input className="input-field mt-1 w-full" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} data-testid="fee-percent" /></label>
          <label className="text-sm font-medium">Days before money is withdrawable<input className="input-field mt-1 w-full" inputMode="numeric" value={hold} onChange={(e) => setHold(e.target.value)} data-testid="hold-days" /></label>
          <div className="flex items-end"><Button type="submit" data-testid="save-settings">Save</Button></div>
        </form>
      </Card>
      {msg && <p role="status" data-testid="queue-message" className="text-sm text-secondaryText">{msg}</p>}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div><h2 className="text-lg font-semibold">Payout requests</h2><p className="text-sm text-secondaryText">Pay each one from the Techra Flutterwave balance, then record the transfer reference.</p></div>
          <select className="input-field" value={filter} onChange={(e) => setFilter(e.target.value as "open" | "all")} aria-label="Filter" data-testid="queue-filter"><option value="open">Needs action</option><option value="all">Everything</option></select>
        </div>
        {shown.length === 0 && <p className="p-5 text-sm text-secondaryText">Nothing waiting.</p>}
        {shown.map((r) => (
          <div key={r.id} className="flex flex-col gap-3 border-t border-border px-5 py-4 first:border-t-0 lg:flex-row lg:items-center lg:justify-between" data-testid="queue-row">
            <div className="min-w-0">
              <p className="font-medium text-primaryText">{formatMoney(r.amount, r.currency)} <span className="text-secondaryText">· {r.workspace}</span></p>
              <p className="break-words text-sm text-secondaryText">{r.bankName} · <span data-testid="queue-account">{r.accountNumber}</span> · {r.accountName}</p>
              <p className="text-xs text-secondaryText">Requested {formatDateTime(r.createdAt)}{r.reference ? ` · Ref ${r.reference}` : ""}{r.note ? ` · ${r.note}` : ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={r.status.toLowerCase()} tone={TONE[r.status]} />
              {r.status === "REQUESTED" && <Button size="sm" variant="secondary" onClick={() => act(r.id, "approve")} data-testid="approve">Approve</Button>}
              {r.status === "APPROVED" && <Button size="sm" onClick={() => act(r.id, "paid")} data-testid="mark-paid">Mark as paid</Button>}
              {(r.status === "REQUESTED" || r.status === "APPROVED") && <Button size="sm" variant="ghost" onClick={() => act(r.id, "reject")} data-testid="decline">Decline</Button>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
