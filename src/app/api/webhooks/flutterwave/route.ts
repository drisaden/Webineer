import { checkRateLimit, clientIp } from "@/lib/security/rate-limit";
import { readTextBody } from "@/lib/server/http";
import { getPrisma } from "@/server/db/prisma";
import { flutterwaveConfig, verifyWebhookSignature } from "@/server/payments/flutterwave";
import { confirmPayment, logPaymentEvent } from "@/server/payments/service";
import { getStore } from "@/server/repositories";
import { fulfilTicket } from "@/services/registration-service";

export const dynamic = "force-dynamic";
const MAX_BODY = 64 * 1024;

function appOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && /^https?:\/\//.test(configured)) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

/**
 * Flutterwave webhook. Authenticity: secret hash / signature. Idempotency: one row per
 * (transaction id, status) in payment_events. The payload is never trusted for value:
 * the transaction is re-verified with the Flutterwave API before anything is granted.
 */
export async function POST(request: Request) {
  const cfg = flutterwaveConfig();
  if (!cfg || !cfg.secretHash || getStore().kind === "mock") return json({ error: "Payments are not configured." }, 503);

  const raw = await readTextBody(request, MAX_BODY);
  if (raw === null) return json({ error: "Payload too large." }, 413);

  if (!verifyWebhookSignature(cfg, raw, request.headers)) {
    // Log rejected attempts, but cap how many rows one sender can create.
    const flood = (await checkRateLimit(`webhook:rejected:${clientIp(request)}`, 20, 10 * 60_000)).allowed === false;
    if (!flood) await logPaymentEvent(null, "webhook.rejected", { reason: "invalid signature", bytes: raw.length }, { signatureValid: false });
    return json({ error: "Invalid signature." }, flood ? 429 : 401);
  }

  let body: { event?: string; "event.type"?: string; type?: string; data?: Record<string, unknown> };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  const eventType = String(body.event ?? body.type ?? body["event.type"] ?? "unknown").slice(0, 60);
  const data = body.data ?? {};
  const txRef = typeof data.tx_ref === "string" ? data.tx_ref.slice(0, 100) : typeof data.txRef === "string" ? data.txRef.slice(0, 100) : null;
  const transactionId = data.id != null ? String(data.id).slice(0, 30) : null;
  const status = typeof data.status === "string" ? data.status.slice(0, 30) : "unknown";

  // Only charge results matter here; everything else is acknowledged and logged.
  const isCharge = eventType === "charge.completed" || eventType.toUpperCase() === "CARD_TRANSACTION" || eventType.startsWith("charge.");
  const dedupeKey = `webhook:${eventType}:${transactionId ?? txRef ?? "none"}:${status}`;
  const db = getPrisma();
  const payment = txRef ? await db.payment.findUnique({ where: { txRef }, select: { id: true } }) : null;

  let event = await logPaymentEvent(payment?.id ?? null, `webhook.${eventType}`, { event: eventType, txRef, transactionId, status }, { dedupeKey, signatureValid: true, processed: false });
  if (!event) {
    const existing = await db.paymentEvent.findUnique({ where: { dedupeKey } });
    if (existing?.processedAt) return json({ received: true, duplicate: true });
    event = existing; // earlier delivery failed mid-way; process again
  }
  const finish = (error?: string) =>
    event ? db.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), error: error ?? null } }).catch(() => undefined) : undefined;

  if (!isCharge || !txRef) {
    await finish(isCharge ? "missing tx_ref" : undefined);
    return json({ received: true });
  }
  if (!payment) {
    await finish("unknown tx_ref");
    return json({ received: true });
  }

  try {
    const result = await confirmPayment({ txRef, transactionId, source: "webhook" });
    if (result.outcome === "pending") {
      // Leave unprocessed and ask Flutterwave to retry later.
      return json({ received: true, retry: true }, 503);
    }
    if (result.newlyCompleted && result.payment?.purpose === "WEBINAR_TICKET" && result.payment.registrationId && result.payment.webinarId) {
      const webinar = await getStore().getWebinar(result.payment.webinarId);
      if (webinar) await fulfilTicket(webinar, result.payment.registrationId, appOrigin(request));
    }
    await finish();
    return json({ received: true, outcome: result.outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (event) await db.paymentEvent.update({ where: { id: event.id }, data: { error: message.slice(0, 500) } }).catch(() => undefined);
    console.error("[webhook:flutterwave]", message);
    return json({ error: "Temporary error." }, 500);
  }
}
