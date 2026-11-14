import { getPrisma } from "@/server/db/prisma";
import { getStore } from "@/server/repositories";
import { personalLinks } from "@/services/workflow-notifications";
import { SAAS_PLANS } from "@/services/billing-entitlements";
import { queueAndDeliver } from "./outbox";
import { renderReceipt } from "./templates";

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Payment confirmation email for a verified payment (ticket or plan). Deduplicated per payment,
 * so the redirect, the webhook and retries can all call it safely.
 */
export async function sendPaymentReceipt(paymentId: string): Promise<void> {
  const db = getPrisma();
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { subscription: true } });
  if (!payment || payment.status !== "SUCCESSFUL") return;
  const meta = (payment.metadata ?? {}) as { plan?: keyof typeof SAAS_PLANS; testMode?: boolean; webinarTitle?: string };
  const base = { amount: Number(payment.amount), currency: payment.currency, reference: payment.txRef, paidAt: payment.verifiedAt ?? new Date(), testMode: meta.testMode === true };

  if (payment.purpose === "WEBINAR_TICKET") {
    const store = getStore();
    const registration = payment.registrationId ? await store.getRegistration(payment.registrationId) : undefined;
    const webinar = payment.webinarId ? await store.getWebinar(payment.webinarId) : undefined;
    const link = webinar && registration ? personalLinks(webinar, registration, appUrl()).joinLink : undefined;
    const email = renderReceipt({ kind: "ticket", name: payment.customerName ?? registration?.name ?? "", itemTitle: webinar?.title ?? meta.webinarTitle ?? "Webinar", link, linkLabel: link ? "Open your webinar link" : undefined, ...base });
    await queueAndDeliver({ template: "payment_receipt", to: payment.customerEmail, toName: payment.customerName, ...email, organizationId: payment.organizationId, webinarId: payment.webinarId, registrationId: payment.registrationId, dedupeKey: `receipt:${payment.id}` });
    return;
  }

  const planName = meta.plan ? SAAS_PLANS[meta.plan]?.name ?? meta.plan : "Plan";
  const email = renderReceipt({ kind: "subscription", name: payment.customerName ?? "", itemTitle: planName, periodEnd: payment.subscription?.currentPeriodEnd ?? null, link: `${appUrl()}/dashboard/billing`, linkLabel: "View billing", ...base });
  await queueAndDeliver({ template: "subscription_receipt", to: payment.customerEmail, toName: payment.customerName, ...email, organizationId: payment.organizationId, dedupeKey: `receipt:${payment.id}` });
}
