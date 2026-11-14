import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, getTicketLedger } from "@/server/payments/ledger";

export const dynamic = "force-dynamic";

export default async function PaymentSettingsPage() {
  const ledger = await getTicketLedger(5);
  if (!ledger) redirect("/login?next=/dashboard/settings/payments");
  const demo = ledger.mode === "demo";
  const transactions = ledger.rows.slice(0, 5);
  return (
    <DashboardShell title="Payment Settings">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Provider</span><CreditCard className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{ledger.provider}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Mode</span><ShieldCheck className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{demo || !ledger.configured ? "Test" : ledger.testMode ? "Sandbox" : "Live"}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Verified</span><CheckCircle2 className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{demo ? "No live keys" : ledger.configured ? "Server-side" : "Not configured"}</p></Card>
        </section>

        <Card>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-semibold">Payment gateway</h3>
            <div className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-medium">Flutterwave</h4>
                  <p className="text-sm text-secondaryText">Hosted checkout. Every payment is verified with Flutterwave on the server (amount, currency, status) before a seat or plan is granted.</p>
                </div>
                <Badge label={demo ? "Demo: simulated" : ledger.configured ? "Connected" : "Not configured"} tone={!demo && ledger.configured ? "success" : "warning"} />
              </div>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-medium">Webhooks</h4>
                  <p className="text-sm text-secondaryText">Confirms payments even if the buyer closes the browser before returning. Endpoint: /api/webhooks/flutterwave</p>
                </div>
                <Badge label={demo ? "Demo" : ledger.webhookConfigured ? "Secret hash set" : "Secret hash missing"} tone={!demo && ledger.webhookConfigured ? "success" : "warning"} />
              </div>
            </div>
            {!demo && <p className="text-xs text-secondaryText">Gateway keys are managed by the site administrator in server environment variables and are never shown here.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-semibold">Recent transactions</h3>
            {!ledger.allowed && <p className="text-sm text-secondaryText">Your role doesn&apos;t include access to payment records.</p>}
            {ledger.allowed && transactions.length === 0 && <p className="text-sm text-secondaryText">No ticket payments yet.</p>}
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="font-medium">{transaction.name}</h4>
                  <p className="text-sm text-secondaryText">{transaction.detail}</p>
                </div>
                <div className="text-sm text-secondaryText">
                  <div>{formatMoney(transaction.amount, transaction.currency)} · {transaction.status}</div>
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
