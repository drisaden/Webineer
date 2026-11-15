import { z } from "zod";
import { audit } from "@/server/audit";
import { getAppSession, getSessionUser } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorize";
import { beginSubscriptionCheckout } from "@/server/billing";
import { getPrisma } from "@/server/db/prisma";
import { paymentsConfigured } from "@/server/payments/service";
import { settingsContext } from "@/server/settings";
import { SAAS_PLANS } from "@/services/billing-entitlements";

export const planChoiceSchema = z.object({ plan: z.enum(["free", "starter", "professional", "business"]) }).strict();

export interface PlanOption {
  key: keyof typeof SAAS_PLANS;
  name: string;
  priceMonthly: number;
  description: string;
  features: string[];
}

/** Plans as shown in the chooser: a short, readable summary of each plan's limits. */
export function planOptions(): PlanOption[] {
  return (Object.keys(SAAS_PLANS) as (keyof typeof SAAS_PLANS)[]).map((key) => {
    const plan = SAAS_PLANS[key];
    const e = plan.entitlements;
    return {
      key,
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      description: plan.description,
      features: [
        `${e.maxWebinars} webinars`,
        `${e.maxRegistrantsPerWebinar.toLocaleString("en-US")} registrants per webinar`,
        e.maxTeamMembers === 1 ? "1 team member" : `${e.maxTeamMembers} team members`,
        e.allowEvergreenAutomated ? "Evergreen (always-on) webinars" : "Live and scheduled webinars",
        ...(e.allowPaidWebinars ? ["Paid webinars"] : []),
        ...(e.allowCustomDomains ? ["Custom domains"] : []),
      ],
    };
  });
}

export function onlinePaymentsReady() {
  return paymentsConfigured();
}

/**
 * Record the owner's first plan decision. Free just records it; a paid plan records it and starts
 * the normal Flutterwave checkout (the plan itself only changes once that payment is verified).
 */
export async function chooseInitialPlan(plan: z.infer<typeof planChoiceSchema>["plan"], origin: string): Promise<{ checkoutUrl: string | null }> {
  const ctx = await settingsContext("org.billing.manage");
  const db = getPrisma();
  let checkoutUrl: string | null = null;
  if (plan !== "free") checkoutUrl = (await beginSubscriptionCheckout(plan, origin)).checkoutUrl;
  const updated = await db.organization.updateMany({ where: { id: ctx.organizationId, planSelectedAt: null }, data: { planSelectedAt: new Date() } });
  if (updated.count > 0) {
    await audit({ organizationId: ctx.organizationId, actorUserId: ctx.user.id, actorEmail: ctx.user.email, action: "onboarding.plan_chosen", targetType: "organization", targetId: ctx.organizationId, metadata: { plan } });
  }
  return { checkoutUrl };
}

/** Mark the product tour as seen for the signed-in user. */
export async function completeTour(): Promise<void> {
  const session = await getSessionUser();
  const app = await getAppSession();
  if (!session || !app) throw new AuthorizationError("Sign in to continue.", 401);
  await getPrisma().user.updateMany({ where: { id: app.profile.id, onboardingCompletedAt: null }, data: { onboardingCompletedAt: new Date() } });
}
