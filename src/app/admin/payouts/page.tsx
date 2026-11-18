import { notFound } from "next/navigation";
import { PayoutQueue } from "@/components/payments/payout-queue";
import { AuthorizationError, requirePlatformPermission } from "@/server/auth/authorize";
import { getSessionUser } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";
import { getStore } from "@/server/repositories";
import { adminPayoutQueue } from "@/server/earnings/service";
import { getHoldDays, getPlatformFeePercent } from "@/server/earnings/settings";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  if (getStore().kind === "mock") return <p className="text-sm text-secondaryText">Payouts need the database, which isn&apos;t connected in demo mode.</p>;
  try {
    await requirePlatformPermission(getPrisma(), await getSessionUser(), "admin.transactions.manage");
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  const [rows, feePercent, holdDays] = await Promise.all([adminPayoutQueue(), getPlatformFeePercent(), getHoldDays()]);
  return <PayoutQueue rows={rows} feePercent={feePercent} holdDays={holdDays} />;
}
