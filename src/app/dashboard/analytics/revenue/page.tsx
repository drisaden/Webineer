import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getPaymentTransactions } from "@/providers/payment";

const transactions = getPaymentTransactions();
const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.status === "completed" ? tx.amount : 0), 0);

export default function RevenueAnalyticsPage() {
  return (
    <DashboardShell title="Revenue Overview">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><div className="text-sm text-secondaryText">Gross revenue</div><p className="mt-3 text-3xl font-semibold">₦{totalRevenue.toLocaleString()}</p></Card>
          <Card className="p-5"><div className="text-sm text-secondaryText">Successful transactions</div><p className="mt-3 text-3xl font-semibold">{transactions.filter((tx) => tx.status === "completed").length}</p></Card>
          <Card className="p-5"><div className="text-sm text-secondaryText">Pending / failed</div><p className="mt-3 text-3xl font-semibold">{transactions.filter((tx) => tx.status !== "completed").length}</p></Card>
        </section>

        <Card>
          <CardContent className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-medium">{transaction.attendeeName}</h3>
                  <p className="text-sm text-secondaryText">{transaction.webinarId} · {transaction.provider}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge label={transaction.status} tone={transaction.status === "completed" ? "success" : transaction.status === "pending" ? "warning" : "info"} />
                  <span className="text-lg font-semibold">₦{transaction.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
