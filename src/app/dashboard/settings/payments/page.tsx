import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getPaymentTransactions } from "@/providers/payment";

const transactions = getPaymentTransactions().slice(0, 5);

export default function PaymentSettingsPage() {
  return (
    <DashboardShell title="Payment Settings">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Provider</span><CreditCard className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">Simulated</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Mode</span><ShieldCheck className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">Test</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Verified</span><CheckCircle2 className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">No live keys</p></Card>
        </section>

        <Card>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-semibold">Provider adapters</h3>
            <div className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Paystack</h4>
                  <p className="text-sm text-secondaryText">Use PAYSTACK_SECRET_KEY for secure initialization and webhook verification.</p>
                </div>
                <Badge label="Ready" tone="success" />
              </div>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Flutterwave</h4>
                  <p className="text-sm text-secondaryText">Supports redirect-based checkout and server-side verification against a configured secret.</p>
                </div>
                <Badge label="Ready" tone="success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-semibold">Recent transactions</h3>
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="font-medium">{transaction.attendeeName}</h4>
                  <p className="text-sm text-secondaryText">{transaction.webinarId} · {transaction.provider}</p>
                </div>
                <div className="text-sm text-secondaryText">
                  <div>₦{transaction.amount.toLocaleString()} · {transaction.status}</div>
                  <div>{transaction.reference}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
