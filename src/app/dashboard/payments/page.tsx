import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PaymentsView, type PaymentsData } from "@/components/payments/payments-view";
import { getAuthMode } from "@/lib/supabase/config";
import { ORG_ROLE_PERMISSIONS } from "@/server/auth/permissions";
import { getAppSession } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";
import { earningsAnalytics, getBalances, getPayoutAccount, listPayouts, listTransactions } from "@/server/earnings/service";
import { getHoldDays, getPlatformFeePercent } from "@/server/earnings/settings";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  if (getAuthMode() !== "supabase") {
    return (
      <DashboardShell title="Payments">
        <p className="text-sm text-secondaryText">Earnings are available in a live workspace. Sign in with your account to see your balance and withdraw.</p>
      </DashboardShell>
    );
  }
  const app = await getAppSession();
  if (!app) redirect("/login?next=/dashboard/payments");
  if (!ORG_ROLE_PERMISSIONS[app.role].includes("payment.view")) {
    return (
      <DashboardShell title="Payments">
        <p className="text-sm text-secondaryText">Your role doesn&apos;t include access to payments. Ask the workspace owner if you need it.</p>
      </DashboardShell>
    );
  }
  const orgId = app.organization.id;
  const db = getPrisma();
  const [org, balances, analytics, transactions, payouts, account, feePercent, holdDays] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: orgId }, select: { currency: true } }),
    getBalances(orgId),
    earningsAnalytics(orgId, 30),
    listTransactions(orgId, 100),
    listPayouts(orgId),
    getPayoutAccount(orgId),
    getPlatformFeePercent(),
    getHoldDays(),
  ]);
  const data: PaymentsData = {
    currency: org.currency,
    balances,
    analytics,
    transactions,
    payouts,
    account,
    feePercent,
    holdDays,
    canManage: ORG_ROLE_PERMISSIONS[app.role].includes("org.billing.manage"),
  };
  return (
    <DashboardShell title="Payments">
      <PaymentsView data={data} />
    </DashboardShell>
  );
}
