import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { audit } from "@/server/audit";
import { getEffectivePlan, paymentsConfigured, paymentsTestMode, startSubscriptionCheckout, type PlanKey } from "@/server/payments/service";
import { settingsContext } from "@/server/settings";
import { getAuthMode } from "@/lib/supabase/config";
import { getAppSession } from "@/server/auth/session";
import { ORG_ROLE_PERMISSIONS } from "@/server/auth/permissions";
import { SAAS_PLANS } from "@/services/billing-entitlements";

export const checkoutSchema = z.object({ plan: z.enum(["starter", "professional", "business"]) }).strict();

export async function beginSubscriptionCheckout(plan: PlanKey, origin: string) {
  const ctx = await settingsContext("org.billing.manage");
  const checkout = await startSubscriptionCheckout({ organizationId: ctx.organizationId, plan, email: ctx.user.email, name: "", origin });
  await audit({ organizationId: ctx.organizationId, actorUserId: ctx.user.id, actorEmail: ctx.user.email, action: "billing.checkout_started", targetType: "payment", targetId: checkout.paymentId, metadata: { plan } });
  return checkout;
}

export interface BillingData {
  mode: "demo" | "live";
  currentPlan: PlanKey;
  periodEnd: string | null;
  canManageBilling: boolean;
  paymentsReady: boolean;
  testMode: boolean;
  history: { id: string; date: string; description: string; amount: string; status: string }[];
}

export async function getBillingData(): Promise<BillingData | null> {
  if (getAuthMode() !== "supabase") {
    return { mode: "demo", currentPlan: "professional", periodEnd: null, canManageBilling: false, paymentsReady: false, testMode: true, history: [] };
  }
  const app = await getAppSession();
  if (!app) return null;
  const orgId = app.organization.id;
  const effective = await getEffectivePlan(orgId);
  const payments = await getPrisma().payment.findMany({ where: { organizationId: orgId, purpose: "PLATFORM_SUBSCRIPTION" }, orderBy: { createdAt: "desc" }, take: 12 });
  return {
    mode: "live",
    currentPlan: effective.plan,
    periodEnd: effective.subscription?.currentPeriodEnd?.toISOString() ?? null,
    canManageBilling: ORG_ROLE_PERMISSIONS[app.role].includes("org.billing.manage"),
    paymentsReady: paymentsConfigured(),
    testMode: paymentsTestMode(),
    history: payments.map((p) => {
      const plan = (p.metadata as { plan?: PlanKey } | null)?.plan;
      return {
        id: p.id,
        date: p.createdAt.toISOString(),
        description: plan ? `${SAAS_PLANS[plan]?.name ?? plan} · 30 days` : "Subscription",
        amount: `${p.currency} ${Number(p.amount).toFixed(2)}`,
        status: p.status.toLowerCase(),
      };
    }),
  };
}
