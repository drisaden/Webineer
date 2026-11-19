import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { SAAS_PLANS } from "@/services/billing-entitlements";
import { createCheckout, flutterwaveConfig, FlutterwaveError, verifyTransaction, type VerifiedTransaction } from "./flutterwave";

/**
 * Database-backed payments (Flutterwave). Two separate purposes share one ledger:
 *  - WEBINAR_TICKET: an attendee buys access to a paid webinar.
 *  - PLATFORM_SUBSCRIPTION: a workspace pays Webineer for a plan.
 * Value is granted only after server-side verification with Flutterwave, exactly once.
 */

export type PlanKey = keyof typeof SAAS_PLANS;
const PLAN_CODES: Record<PlanKey, "FREE" | "STARTER" | "PROFESSIONAL" | "BUSINESS"> = { free: "FREE", starter: "STARTER", professional: "PROFESSIONAL", business: "BUSINESS" };
const CHECKOUT_REUSE_MS = 30 * 60 * 1000;
const SUBSCRIPTION_PERIOD_DAYS = 30;

export class PaymentError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function paymentsConfigured(): boolean {
  return flutterwaveConfig() !== null;
}

export function paymentsTestMode(): boolean {
  return flutterwaveConfig()?.testMode ?? true;
}

const toMinor = (n: number | Prisma.Decimal) => Math.round(Number(n) * 100);

async function logEvent(paymentId: string | null, eventType: string, payload: Record<string, unknown>, extra: { dedupeKey?: string; signatureValid?: boolean; error?: string; processed?: boolean } = {}) {
  try {
    return await getPrisma().paymentEvent.create({
      data: {
        paymentId,
        provider: "FLUTTERWAVE",
        eventType,
        dedupeKey: extra.dedupeKey ?? `${eventType}:${randomUUID()}`,
        signatureValid: extra.signatureValid,
        payload: payload as Prisma.InputJsonValue,
        error: extra.error,
        processedAt: extra.processed === false ? null : new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
    console.error("[payments] failed to log event", eventType, error);
    return null;
  }
}

interface CheckoutInput {
  organizationId: string;
  purpose: "WEBINAR_TICKET" | "PLATFORM_SUBSCRIPTION";
  amount: number;
  currency: "NGN" | "USD" | "EUR" | "GBP";
  idempotencyKey: string;
  customer: { email: string; name?: string };
  title: string;
  redirectUrl: (txRef: string) => string;
  webinarId?: string;
  registrationId?: string;
  metadata: Record<string, unknown>;
}

/**
 * Create (or reuse) a pending payment and its Flutterwave checkout link. The idempotency key
 * maps double-submits within a 30-minute window to the same payment and the same link.
 */
async function startCheckout(input: CheckoutInput): Promise<{ paymentId: string; txRef: string; checkoutUrl: string }> {
  const cfg = flutterwaveConfig();
  if (!cfg) throw new PaymentError("Online payments aren't set up yet.", 503);
  if (!(input.amount > 0)) throw new PaymentError("Invalid amount.");
  const db = getPrisma();

  const existing = await db.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    const fresh = Date.now() - existing.createdAt.getTime() < CHECKOUT_REUSE_MS;
    const same = toMinor(existing.amount) === toMinor(input.amount) && existing.currency === input.currency;
    if (existing.status === "PENDING" && existing.checkoutUrl && fresh && same) return { paymentId: existing.id, txRef: existing.txRef, checkoutUrl: existing.checkoutUrl };
    // A ticket is bought once; a plan can legitimately be bought again (renewal), which gets a new key below.
    if (existing.status === "SUCCESSFUL" && input.purpose === "WEBINAR_TICKET") throw new PaymentError("This has already been paid.", 409);
  }

  const txRef = `${input.purpose === "WEBINAR_TICKET" ? "wbt" : "wbs"}_${randomUUID().replace(/-/g, "")}`;
  let payment;
  try {
    payment = await db.payment.create({
      data: {
        organizationId: input.organizationId,
        purpose: input.purpose,
        provider: "FLUTTERWAVE",
        amount: new Prisma.Decimal(input.amount.toFixed(2)),
        currency: input.currency,
        txRef,
        // A stale/failed (or, for plans, completed) attempt under the same key gets a new key.
        idempotencyKey: existing ? `${input.idempotencyKey}:${txRef}` : input.idempotencyKey,
        webinarId: input.webinarId,
        registrationId: input.registrationId,
        customerEmail: input.customer.email,
        customerName: input.customer.name,
        metadata: { ...input.metadata, testMode: cfg.testMode } as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    // Concurrent double-submit: the other request owns the payment; reuse its link once ready.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      for (let i = 0; i < 20; i++) {
        const other = await db.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (other?.checkoutUrl && other.status === "PENDING") return { paymentId: other.id, txRef: other.txRef, checkoutUrl: other.checkoutUrl };
        if (other && other.status !== "PENDING") break;
        await new Promise((r) => setTimeout(r, 250));
      }
      throw new PaymentError("Payment is already being started. Please try again in a moment.", 409);
    }
    throw error;
  }
  await logEvent(payment.id, "checkout.initialized", { txRef, amount: input.amount, currency: input.currency, purpose: input.purpose }, { dedupeKey: `init:${txRef}` });

  try {
    const checkoutUrl = await createCheckout(cfg, {
      txRef,
      amount: input.amount,
      currency: input.currency,
      redirectUrl: input.redirectUrl(txRef),
      customer: input.customer,
      title: input.title,
      meta: { payment_id: payment.id, purpose: input.purpose },
    });
    await db.payment.update({ where: { id: payment.id }, data: { checkoutUrl } });
    return { paymentId: payment.id, txRef, checkoutUrl };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Checkout failed";
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: reason.slice(0, 500) } });
    await logEvent(payment.id, "checkout.failed", { txRef }, { error: reason.slice(0, 500) });
    throw new PaymentError("Payment couldn't be started. Please try again.", 502);
  }
}

export async function startTicketCheckout(input: {
  organizationId: string;
  webinarId: string;
  webinarTitle: string;
  registrationId: string;
  email: string;
  name: string;
  amount: number;
  currency: "NGN" | "USD" | "EUR" | "GBP";
  origin: string;
}) {
  const windowKey = Math.floor(Date.now() / CHECKOUT_REUSE_MS);
  return startCheckout({
    organizationId: input.organizationId,
    purpose: "WEBINAR_TICKET",
    amount: input.amount,
    currency: input.currency,
    idempotencyKey: `ticket:${input.registrationId}:${windowKey}`,
    customer: { email: input.email, name: input.name },
    title: input.webinarTitle,
    redirectUrl: () => `${input.origin}/api/public/payments/verify/${input.registrationId}`,
    webinarId: input.webinarId,
    registrationId: input.registrationId,
    metadata: { kind: "ticket", webinarTitle: input.webinarTitle },
  });
}

/** Checkout for buying a webinar's replay. It is recorded as a ticket-type sale (same earnings and fee), marked kind "replay". */
export async function startReplayCheckout(input: {
  organizationId: string;
  webinarId: string;
  webinarTitle: string;
  registrationId: string;
  email: string;
  name: string;
  amount: number;
  currency: "NGN" | "USD" | "EUR" | "GBP";
  origin: string;
}) {
  const windowKey = Math.floor(Date.now() / CHECKOUT_REUSE_MS);
  return startCheckout({
    organizationId: input.organizationId,
    purpose: "WEBINAR_TICKET",
    amount: input.amount,
    currency: input.currency,
    idempotencyKey: `replay:${input.registrationId}:${windowKey}`,
    customer: { email: input.email, name: input.name },
    title: `${input.webinarTitle} (replay)`,
    redirectUrl: () => `${input.origin}/api/public/replay/verify/${input.registrationId}`,
    webinarId: input.webinarId,
    registrationId: input.registrationId,
    metadata: { kind: "replay", webinarTitle: input.webinarTitle },
  });
}

export async function startSubscriptionCheckout(input: { organizationId: string; plan: PlanKey; email: string; name: string; origin: string }) {
  const plan = SAAS_PLANS[input.plan];
  if (!plan || plan.priceMonthly <= 0) throw new PaymentError("Choose a paid plan.");
  const windowKey = Math.floor(Date.now() / CHECKOUT_REUSE_MS);
  return startCheckout({
    organizationId: input.organizationId,
    purpose: "PLATFORM_SUBSCRIPTION",
    amount: plan.priceMonthly,
    currency: plan.currency as "USD",
    idempotencyKey: `subscription:${input.organizationId}:${input.plan}:${windowKey}`,
    customer: { email: input.email, name: input.name },
    title: `Webineer ${plan.name} (30 days)`,
    redirectUrl: () => `${input.origin}/api/billing/verify`,
    metadata: { kind: "subscription", plan: input.plan, interval: "MONTHLY", periodDays: SUBSCRIPTION_PERIOD_DAYS },
  });
}

export type ConfirmOutcome = "successful" | "failed" | "pending" | "unknown";
export interface ConfirmResult {
  outcome: ConfirmOutcome;
  /** True only for the single call that granted value (tickets unlocked / subscription extended). */
  newlyCompleted: boolean;
  payment?: { id: string; purpose: string; organizationId: string; registrationId: string | null; webinarId: string | null };
}

/**
 * Verify a payment with Flutterwave and grant value exactly once. Inputs from the browser or
 * webhook are only lookup hints; amount, currency, status and tx_ref are checked against the API.
 */
export async function confirmPayment(lookup: { txRef: string; transactionId?: string | null; source: "redirect" | "webhook" | "manual" }): Promise<ConfirmResult> {
  const db = getPrisma();
  const cfg = flutterwaveConfig();
  const payment = await db.payment.findUnique({ where: { txRef: lookup.txRef } });
  if (!payment) return { outcome: "unknown", newlyCompleted: false };
  const ref = { id: payment.id, purpose: payment.purpose, organizationId: payment.organizationId, registrationId: payment.registrationId, webinarId: payment.webinarId };
  if (payment.status === "SUCCESSFUL") return { outcome: "successful", newlyCompleted: false, payment: ref };
  if (!cfg) return { outcome: "pending", newlyCompleted: false, payment: ref };

  let verified: VerifiedTransaction | null;
  try {
    verified = await verifyTransaction(cfg, { transactionId: lookup.transactionId, txRef: payment.txRef });
  } catch (error) {
    await logEvent(payment.id, `verify.${lookup.source}.error`, { txRef: payment.txRef }, { error: error instanceof Error ? error.message : String(error) });
    if (error instanceof FlutterwaveError) return { outcome: "pending", newlyCompleted: false, payment: ref };
    throw error;
  }
  await logEvent(payment.id, `verify.${lookup.source}`, { txRef: payment.txRef, result: verified?.raw ?? null });

  if (!verified || verified.txRef !== payment.txRef) return { outcome: "pending", newlyCompleted: false, payment: ref };
  if (verified.status === "failed" || verified.status === "cancelled") {
    await db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: verified.status === "failed" ? "FAILED" : "CANCELLED", failureReason: `Flutterwave status: ${verified.status}`, verification: verified.raw as Prisma.InputJsonValue } });
    if (payment.registrationId) await db.registration.updateMany({ where: { id: payment.registrationId, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED" } });
    return { outcome: "failed", newlyCompleted: false, payment: ref };
  }
  if (verified.status !== "successful") return { outcome: "pending", newlyCompleted: false, payment: ref };

  // Amount/currency must match what we charged. A mismatch is never granted; it is held for review.
  if (verified.currency !== payment.currency || toMinor(verified.amount) < toMinor(payment.amount)) {
    await db.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESSFUL" } },
      data: { status: "FAILED", failureReason: `Amount/currency mismatch: paid ${verified.amount} ${verified.currency}, expected ${payment.amount} ${payment.currency}`, verification: verified.raw as Prisma.InputJsonValue },
    });
    await logEvent(payment.id, "verify.mismatch", { txRef: payment.txRef, paid: verified.amount, currency: verified.currency });
    return { outcome: "failed", newlyCompleted: false, payment: ref };
  }

  try {
    const granted = await db.$transaction(async (tx) => {
      const won = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: "SUCCESSFUL" } },
        data: { status: "SUCCESSFUL", providerTransactionId: verified.id || null, verification: verified.raw as Prisma.InputJsonValue, verifiedAt: new Date(), failureReason: null },
      });
      if (won.count !== 1) return false;
      const isReplay = (payment.metadata as { kind?: string } | null)?.kind === "replay";
      if (payment.purpose === "WEBINAR_TICKET" && payment.registrationId && isReplay) {
        // A replay purchase unlocks the replay only. It never marks the live ticket as paid.
        const reg = await tx.registration.findUnique({ where: { id: payment.registrationId }, select: { metadata: true } });
        const meta = (reg?.metadata ?? {}) as Record<string, unknown>;
        await tx.registration.update({ where: { id: payment.registrationId }, data: { metadata: { ...meta, replayPaid: true, replayPaidAt: new Date().toISOString() } as Prisma.InputJsonValue } });
      } else if (payment.purpose === "WEBINAR_TICKET" && payment.registrationId) {
        await tx.registration.updateMany({ where: { id: payment.registrationId }, data: { paymentStatus: "PAID" } });
      }
      if (payment.purpose === "WEBINAR_TICKET") {
        const fee = Number((verified.raw as { app_fee?: unknown }).app_fee);
        const { recordSale } = await import("@/server/earnings/service");
        await recordSale(tx, payment, Number.isFinite(fee) ? fee : null);
      }
      if (payment.purpose === "PLATFORM_SUBSCRIPTION") await activateSubscription(tx, payment.id);
      return true;
    });
    if (granted) {
      await logEvent(payment.id, "payment.completed", { txRef: payment.txRef, source: lookup.source, transactionId: verified.id }, { dedupeKey: `completed:${payment.id}` });
      const { audit } = await import("@/server/audit");
      await audit({
        organizationId: payment.organizationId,
        actorEmail: payment.customerEmail,
        action: payment.purpose === "PLATFORM_SUBSCRIPTION" ? "billing.subscription_paid" : "payment.ticket_paid",
        targetType: "payment",
        targetId: payment.id,
        metadata: { amount: Number(payment.amount), currency: payment.currency, source: lookup.source },
      });
      // Receipt is best-effort here; the outbox retries delivery and dedupes per payment.
      await import("@/server/email/receipts").then((m) => m.sendPaymentReceipt(payment.id)).catch((error) => console.error("[payments] receipt failed", error));
    }
    return { outcome: "successful", newlyCompleted: granted, payment: ref };
  } catch (error) {
    // The same Flutterwave transaction can't pay for two of our payments.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      await db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED", failureReason: "Flutterwave transaction already used for another payment." } });
      return { outcome: "failed", newlyCompleted: false, payment: ref };
    }
    throw error;
  }
}

type Tx = Parameters<Parameters<ReturnType<typeof getPrisma>["$transaction"]>[0]>[0];

/** Extend (same plan) or replace (different plan) the workspace subscription. Runs inside the grant transaction. */
async function activateSubscription(tx: Tx, paymentId: string) {
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
  const meta = (payment.metadata ?? {}) as { plan?: PlanKey; periodDays?: number };
  const planKey = meta.plan && meta.plan in PLAN_CODES ? meta.plan : null;
  if (!planKey) throw new Error("Subscription payment without a plan.");
  const plan = PLAN_CODES[planKey];
  const days = meta.periodDays ?? SUBSCRIPTION_PERIOD_DAYS;
  const now = new Date();

  // Serialise per organization.
  await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${payment.organizationId}::uuid FOR UPDATE`;
  const current = await tx.subscription.findFirst({ where: { organizationId: payment.organizationId, status: "ACTIVE" }, orderBy: { currentPeriodEnd: "desc" } });
  let subscriptionId: string;
  if (current && current.plan === plan) {
    const base = current.currentPeriodEnd && current.currentPeriodEnd > now ? current.currentPeriodEnd : now;
    const end = new Date(base.getTime() + days * 86400e3);
    await tx.subscription.update({ where: { id: current.id }, data: { currentPeriodEnd: end, cancelAtPeriodEnd: false } });
    subscriptionId = current.id;
  } else {
    if (current) await tx.subscription.update({ where: { id: current.id }, data: { status: "CANCELLED", cancelledAt: now } });
    const created = await tx.subscription.create({
      data: {
        organizationId: payment.organizationId,
        plan,
        status: "ACTIVE",
        interval: "MONTHLY",
        amount: payment.amount,
        currency: payment.currency,
        provider: "FLUTTERWAVE",
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + days * 86400e3),
      },
    });
    subscriptionId = created.id;
  }
  await tx.payment.update({ where: { id: paymentId }, data: { subscriptionId } });
  await tx.organization.update({ where: { id: payment.organizationId }, data: { plan } });
}

/** The plan a workspace is entitled to right now (an expired subscription falls back to Free). */
export async function getEffectivePlan(organizationId: string): Promise<{ plan: PlanKey; subscription: { plan: string; currentPeriodEnd: Date | null } | null }> {
  const db = getPrisma();
  const sub = await db.subscription.findFirst({ where: { organizationId, status: "ACTIVE", currentPeriodEnd: { gt: new Date() } }, orderBy: { currentPeriodEnd: "desc" } });
  if (sub) return { plan: sub.plan.toLowerCase() as PlanKey, subscription: { plan: sub.plan, currentPeriodEnd: sub.currentPeriodEnd } };
  // Plans assigned manually by a platform admin (no subscription row) are honoured too.
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { plan: true } });
  const manual = (org?.plan ?? "FREE").toLowerCase() as PlanKey;
  const hasExpiredPaid = await db.subscription.count({ where: { organizationId, provider: "FLUTTERWAVE" } });
  return { plan: hasExpiredPaid ? "free" : manual, subscription: null };
}

/** Latest ticket payment for a registration (optionally the one matching a tx_ref hint). */
export async function findTicketPayment(registrationId: string, txRefHint?: string | null) {
  const db = getPrisma();
  if (txRefHint) {
    const hinted = await db.payment.findFirst({ where: { txRef: txRefHint, registrationId, purpose: "WEBINAR_TICKET", metadata: { path: ["kind"], equals: "ticket" } } });
    if (hinted) return hinted;
  }
  return db.payment.findFirst({ where: { registrationId, purpose: "WEBINAR_TICKET", metadata: { path: ["kind"], equals: "ticket" } }, orderBy: { createdAt: "desc" } });
}

/** The replay purchase payment for a registration (never the live ticket). */
export async function findReplayPayment(registrationId: string, txRefHint?: string | null) {
  const db = getPrisma();
  return db.payment.findFirst({
    where: { registrationId, purpose: "WEBINAR_TICKET", metadata: { path: ["kind"], equals: "replay" }, ...(txRefHint ? { txRef: txRefHint } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export { logEvent as logPaymentEvent };
