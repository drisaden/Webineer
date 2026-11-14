import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, getTicketLedger } from "@/server/payments/ledger";

export const dynamic = "force-dynamic";

export default async function RevenueAnalyticsPage() {
  const ledger = await getTicketLedger();
  if (!ledger) redirect("/login?next=/dashboard/analytics/revenue");
  const transactions = ledger.rows;
  const completed = transactions.filter((tx) => tx.status === "completed");
  // Revenue is totalled per currency; amounts in different currencies are never added together.
  const totals = Object.entries(completed.reduce<Record<string, number>>((acc, tx) => ({ ...acc, [tx.currency]: (acc[tx.currency] ?? 0) + tx.amount }), {}));
  return (
    <DashboardShell title="Revenue Overview">
      <div className="space-y-6">
        {!ledger.allowed && <Card className="p-5 text-sm text-secondaryText">Your role doesn&apos;t include access to payment records.</Card>}
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><div className="text-sm text-secondaryText">Gross revenue</div><p className="mt-3 text-3xl font-semibold">{totals.length ? totals.map(([c, a]) => formatMoney(a, c)).join(" · ") : formatMoney(0, "NGN")}</p></Card>
          <Card className="p-5"><div className="text-sm text-secondaryText">Successful transactions</div><p className="mt-3 text-3xl font-semibold">{completed.length}</p></Card>
          <Card className="p-5"><div className="text-sm text-secondaryText">Pending / failed</div><p className="mt-3 text-3xl font-semibold">{transactions.length - completed.length}</p></Card>
        </section>

        <Card>
          <CardContent className="space-y-4">
            {transactions.length === 0 && <p className="text-sm text-secondaryText">No ticket payments yet.</p>}
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-medium">{transaction.name}</h3>
                  <p className="text-sm text-secondaryText">{transaction.detail}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge label={transaction.status} tone={transaction.status === "completed" ? "success" : transaction.status === "pending" ? "warning" : "info"} />
                  <span className="text-lg font-semibold">{formatMoney(transaction.amount, transaction.currency)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
