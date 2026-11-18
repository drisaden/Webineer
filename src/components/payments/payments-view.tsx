"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Landmark, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatDay } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import type { Balance, TransactionRow } from "@/server/earnings/service";

export interface PaymentsData {
  currency: string;
  balances: Balance[];
  analytics: { days: number; series: { date: string; net: number }[]; refunds: number; webinars: { id: string; title: string; net: number; sales: number; registered: number; conversion: number }[] };
  transactions: TransactionRow[];
  payouts: { id: string; amount: number; currency: string; status: string; createdAt: string; processedAt: string | null; reference: string | null; note: string | null; bank: string }[];
  account: { bankName: string; bankCode: string | null; accountMasked: string; accountName: string; schedule: "manual" | "weekly" | "monthly"; minimumPayout: number } | null;
  feePercent: number;
  holdDays: number;
  canManage: boolean;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "analytics", label: "Analytics" },
  { key: "transactions", label: "Transactions" },
  { key: "withdrawals", label: "Withdrawals" },
  { key: "settings", label: "Payout settings" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "info" | "default" }> = {
  REQUESTED: { label: "In review", tone: "info" },
  APPROVED: { label: "Approved", tone: "info" },
  PAID: { label: "Paid", tone: "success" },
  REJECTED: { label: "Declined", tone: "warning" },
  CANCELLED: { label: "Cancelled", tone: "default" },
};
const TYPE_LABEL: Record<string, string> = { SALE: "Sale", REFUND: "Refund", PAYOUT: "Withdrawal", PAYOUT_REVERSAL: "Returned", ADJUSTMENT: "Adjustment" };

export function PaymentsView({ data }: { data: PaymentsData }) {
  const [tab, setTab] = useState<Tab>("overview");
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <div className="space-y-5" data-testid="payments-view">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Payments sections">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} data-testid={`tab-${t.key}`} onClick={() => setTab(t.key)} className={cn("min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-medium transition", tab === t.key ? "bg-[#041B5E] text-white" : "bg-white/70 text-secondaryText hover:bg-white")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview data={data} go={setTab} />}
      {tab === "analytics" && <Analytics data={data} />}
      {tab === "transactions" && <Transactions data={data} />}
      {tab === "withdrawals" && <Withdrawals data={data} refresh={refresh} go={setTab} />}
      {tab === "settings" && <Settings data={data} refresh={refresh} />}
    </div>
  );
}

function primary(data: PaymentsData): Balance {
  return data.balances.find((b) => b.currency === data.currency) ?? data.balances[0] ?? { currency: data.currency as Balance["currency"], available: 0, pending: 0, inReview: 0, withdrawn: 0, lifetimeNet: 0, lifetimeGross: 0, platformFees: 0 };
}

function Stat({ label, value, hint, testid }: { label: string; value: string; hint?: string; testid?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-secondaryText">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold text-primaryText" data-testid={testid}>{value}</p>
      {hint && <p className="mt-1 text-xs text-secondaryText">{hint}</p>}
    </Card>
  );
}

function Overview({ data, go }: { data: PaymentsData; go: (t: Tab) => void }) {
  const b = primary(data);
  const others = data.balances.filter((x) => x.currency !== b.currency && (x.available || x.pending || x.withdrawn || x.inReview));
  const max = Math.max(1, ...data.analytics.series.map((s) => s.net));
  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Available to withdraw" value={formatMoney(b.available, b.currency)} testid="balance-available" />
        <Stat label="Pending" value={formatMoney(b.pending, b.currency)} hint={data.holdDays ? `Becomes available ${data.holdDays} day${data.holdDays === 1 ? "" : "s"} after each sale` : undefined} testid="balance-pending" />
        <Stat label="In review" value={formatMoney(b.inReview, b.currency)} hint="Withdrawals waiting for payment" testid="balance-review" />
        <Stat label="Withdrawn" value={formatMoney(b.withdrawn, b.currency)} testid="balance-withdrawn" />
      </section>
      {others.length > 0 && (
        <Card className="p-5 text-sm text-secondaryText">
          Other currencies: {others.map((o) => `${formatMoney(o.available, o.currency)} available`).join(" · ")}
        </Card>
      )}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Earnings, last {data.analytics.days} days</h3>
            <p className="text-sm text-secondaryText">After the {data.feePercent}% platform fee</p>
          </div>
          <Button size="sm" onClick={() => go("withdrawals")} data-testid="go-withdraw"><Wallet className="mr-2 h-4 w-4" />Withdraw</Button>
        </div>
        <div className="mt-5 flex h-36 items-end gap-[3px]" role="img" aria-label="Daily earnings">
          {data.analytics.series.map((s) => (
            <div key={s.date} title={`${formatDay(s.date)}: ${formatMoney(s.net, b.currency)}`} className="flex-1 rounded-t bg-[#16D6B2]/80" style={{ height: `${Math.max(2, (s.net / max) * 100)}%`, opacity: s.net ? 1 : 0.25 }} />
          ))}
        </div>
      </Card>
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total sales" value={formatMoney(b.lifetimeGross, b.currency)} />
        <Stat label="Platform fees" value={formatMoney(b.platformFees, b.currency)} hint={`${data.feePercent}% of each ticket`} />
        <Stat label="Your earnings" value={formatMoney(b.lifetimeNet, b.currency)} />
      </section>
      {!data.account && data.canManage && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-[#16D6B2]/40 p-5">
          <p className="text-sm text-secondaryText">Add your bank account so you can withdraw your earnings.</p>
          <Button size="sm" variant="secondary" onClick={() => go("settings")}>Add bank account</Button>
        </Card>
      )}
    </div>
  );
}

function Analytics({ data }: { data: PaymentsData }) {
  const b = primary(data);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-lg font-semibold">Revenue by webinar</h3>
        <p className="text-sm text-secondaryText">Last {data.analytics.days} days · {data.analytics.refunds} refund{data.analytics.refunds === 1 ? "" : "s"}</p>
      </div>
      {data.analytics.webinars.length === 0 ? (
        <p className="p-5 text-sm text-secondaryText">No ticket sales in this period yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F7F9FC] text-secondaryText"><tr><th className="px-5 py-3 font-medium">Webinar</th><th className="px-5 py-3 font-medium">Sales</th><th className="px-5 py-3 font-medium">Registered</th><th className="px-5 py-3 font-medium">Conversion</th><th className="px-5 py-3 font-medium">Earnings</th></tr></thead>
            <tbody>
              {data.analytics.webinars.map((w) => (
                <tr key={w.id} className="border-t border-border" data-testid="analytics-row">
                  <td className="px-5 py-4 font-medium text-primaryText">{w.title}</td>
                  <td className="px-5 py-4 text-secondaryText">{w.sales}</td>
                  <td className="px-5 py-4 text-secondaryText">{w.registered}</td>
                  <td className="px-5 py-4 text-secondaryText">{w.conversion}%</td>
                  <td className="px-5 py-4 text-primaryText">{formatMoney(w.net, b.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Transactions({ data }: { data: PaymentsData }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold">Transactions</h3>
          <p className="text-sm text-secondaryText">Every sale, refund and withdrawal</p>
        </div>
        <Button asChild variant="secondary" size="sm"><a href="/api/earnings/transactions" data-testid="export-csv"><Download className="mr-2 h-4 w-4" />Export CSV</a></Button>
      </div>
      {data.transactions.length === 0 ? <p className="p-5 text-sm text-secondaryText">No transactions yet.</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F7F9FC] text-secondaryText"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Type</th><th className="px-5 py-3 font-medium">Details</th><th className="px-5 py-3 font-medium">Paid</th><th className="px-5 py-3 font-medium">Fee</th><th className="px-5 py-3 font-medium">You get</th></tr></thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id} className="border-t border-border" data-testid="tx-row">
                  <td className="whitespace-nowrap px-5 py-4 text-secondaryText">{formatDateTime(t.date)}</td>
                  <td className="px-5 py-4"><Badge label={TYPE_LABEL[t.type] ?? t.type} tone={t.type === "SALE" ? "success" : t.type === "REFUND" ? "warning" : "info"} /></td>
                  <td className="px-5 py-4 text-secondaryText">{t.webinar || t.description}{t.buyer ? ` · ${t.buyer}` : ""}</td>
                  <td className="px-5 py-4 text-secondaryText">{t.gross ? formatMoney(t.gross, t.currency) : "—"}</td>
                  <td className="px-5 py-4 text-secondaryText">{t.platformFee ? formatMoney(t.platformFee, t.currency) : "—"}</td>
                  <td className={cn("px-5 py-4 font-medium", t.net < 0 ? "text-[#B4372E]" : "text-primaryText")}>{formatMoney(t.net, t.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function newKey() {
  return `w_${crypto.randomUUID().replace(/-/g, "")}`;
}

function Withdrawals({ data, refresh, go }: { data: PaymentsData; refresh: () => void; go: (t: Tab) => void }) {
  const b = primary(data);
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [key, setKey] = useState(newKey);
  const parsed = Number(amount);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      const res = await fetch("/api/earnings/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: parsed, currency: b.currency, password, idempotencyKey: key }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage({ ok: false, text: body.error ?? "We couldn't send that request." }); return; }
      setMessage({ ok: true, text: "Withdrawal requested. We'll review it and pay it into your bank account." });
      setAmount(""); setPassword(""); setKey(newKey()); refresh();
    } catch { setMessage({ ok: false, text: "We couldn't reach the server. Please try again." }); } finally { setBusy(false); }
  }

  async function cancel(id: string) {
    const res = await fetch(`/api/earnings/withdraw/${id}/cancel`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setMessage(res.ok ? { ok: true, text: "Withdrawal cancelled. The money is back in your balance." } : { ok: false, text: body.error ?? "We couldn't cancel that." });
    refresh();
  }

  return (
    <div className="space-y-5">
      {data.canManage && (
        <Card className="p-5">
          <h3 className="text-lg font-semibold">Withdraw</h3>
          {!data.account ? (
            <p className="mt-2 text-sm text-secondaryText">Add your bank account first. <button className="font-medium text-[#0A7F6B] underline" onClick={() => go("settings")}>Payout settings</button></p>
          ) : (
            <form onSubmit={submit} className="mt-3 grid gap-4 sm:grid-cols-2" data-testid="withdraw-form">
              <p className="text-sm text-secondaryText sm:col-span-2">Available: <strong data-testid="withdraw-available">{formatMoney(b.available, b.currency)}</strong> · Goes to {data.account.bankName} {data.account.accountMasked}</p>
              <label className="text-sm font-medium">Amount ({b.currency})<input className="input-field mt-1 w-full" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="withdraw-amount" placeholder="0.00" /></label>
              <label className="text-sm font-medium">Confirm your password<input className="input-field mt-1 w-full" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="withdraw-password" /></label>
              <div className="sm:col-span-2"><Button type="submit" disabled={busy || !(parsed > 0) || !password} data-testid="withdraw-submit">{busy ? "Sending…" : "Request withdrawal"}</Button></div>
            </form>
          )}
          {message && <p role="status" data-testid="withdraw-message" className={cn("mt-3 text-sm", message.ok ? "text-[#0F7B52]" : "text-[#B4372E]")}>{message.text}</p>}
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4"><h3 className="text-lg font-semibold">Withdrawal history</h3></div>
        {data.payouts.length === 0 ? <p className="p-5 text-sm text-secondaryText">No withdrawals yet.</p> : data.payouts.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 border-t border-border px-5 py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between" data-testid="payout-row">
            <div>
              <p className="font-medium text-primaryText">{formatMoney(p.amount, p.currency)} <span className="text-secondaryText">to {p.bank}</span></p>
              <p className="text-xs text-secondaryText">Requested {formatDateTime(p.createdAt)}{p.reference ? ` · Ref ${p.reference}` : ""}{p.note ? ` · ${p.note}` : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge label={STATUS[p.status]?.label ?? p.status} tone={STATUS[p.status]?.tone ?? "default"} />
              {p.status === "REQUESTED" && data.canManage && <button className="min-h-[44px] text-sm font-medium text-[#B4372E] underline" onClick={() => cancel(p.id)} data-testid="cancel-payout">Cancel</button>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Settings({ data, refresh }: { data: PaymentsData; refresh: () => void }) {
  const a = data.account;
  const [f, setF] = useState({ bankName: a?.bankName ?? "", accountNumber: "", accountName: a?.accountName ?? "", schedule: a?.schedule ?? "manual", minimumPayout: String(a?.minimumPayout ?? 0), password: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const disabled = !data.canManage;
  const numberOk = a ? f.accountNumber === "" || f.accountNumber.length === 10 : f.accountNumber.length === 10;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      const res = await fetch("/api/earnings/payout-account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, minimumPayout: Number(f.minimumPayout || 0) }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setMessage({ ok: false, text: body.error ?? "We couldn't save that." });
      else { setMessage({ ok: true, text: "Payout settings saved." }); setF({ ...f, accountNumber: "", password: "" }); refresh(); }
    } catch { setMessage({ ok: false, text: "We couldn't reach the server. Please try again." }); } finally { setBusy(false); }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-[#16D6B2]" /><h3 className="text-lg font-semibold">Bank account</h3></div>
      <p className="mt-1 text-sm text-secondaryText">Ticket payments are collected by Techra and paid out to this account. Payouts are reviewed by our team before they are sent.</p>
      {a && <p className="mt-3 rounded-xl bg-[#F7F9FC] p-3 text-sm" data-testid="account-current">{a.bankName} · {a.accountMasked} · {a.accountName}</p>}
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2" data-testid="payout-settings-form">
        <label className="text-sm font-medium">Bank name<input className="input-field mt-1 w-full" value={f.bankName} onChange={set("bankName")} disabled={disabled} data-testid="bank-name" /></label>
        <label className="text-sm font-medium">Account number<input className="input-field mt-1 w-full" inputMode="numeric" maxLength={10} value={f.accountNumber} onChange={set("accountNumber")} disabled={disabled} placeholder={a ? "Leave blank to keep the current number" : "10 digits"} data-testid="account-number" /></label>
        <label className="text-sm font-medium">Account name<input className="input-field mt-1 w-full" value={f.accountName} onChange={set("accountName")} disabled={disabled} data-testid="account-name" /></label>
        <label className="text-sm font-medium">Payout schedule
          <select className="input-field mt-1 w-full" value={f.schedule} onChange={set("schedule")} disabled={disabled} data-testid="schedule">
            <option value="manual">I&apos;ll request withdrawals myself</option>
            <option value="weekly">Weekly (coming soon, manual for now)</option>
            <option value="monthly">Monthly (coming soon, manual for now)</option>
          </select>
        </label>
        <label className="text-sm font-medium">Minimum withdrawal ({data.currency})<input className="input-field mt-1 w-full" inputMode="decimal" value={f.minimumPayout} onChange={set("minimumPayout")} disabled={disabled} data-testid="minimum" /></label>
        <label className="text-sm font-medium">Confirm your password<input className="input-field mt-1 w-full" type="password" autoComplete="current-password" value={f.password} onChange={set("password")} disabled={disabled} data-testid="settings-password" /></label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={disabled || busy || !f.password || !f.bankName || !f.accountName || !numberOk} data-testid="save-account">{busy ? "Saving…" : "Save payout settings"}</Button>
          {disabled && <p className="mt-2 text-sm text-secondaryText">Only the workspace owner can change payout settings.</p>}
        </div>
      </form>
      {message && <p role="status" data-testid="settings-message" className={cn("mt-3 text-sm", message.ok ? "text-[#0F7B52]" : "text-[#B4372E]")}>{message.text}</p>}
    </Card>
  );
}
