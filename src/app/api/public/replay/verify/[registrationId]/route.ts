import { limitOr429 } from "@/lib/server/http";
import { originFromRequest } from "@/lib/server/request-origin";
import { confirmPayment, findReplayPayment } from "@/server/payments/service";
import { getStore } from "@/server/repositories";
import { registrationAccessKey } from "@/services/workflow-notifications";

export const dynamic = "force-dynamic";

/**
 * Return URL after paying for a replay. Flutterwave's query values are lookup hints only: the payment is
 * verified server-side. Only the payer's own return (with their tx_ref) receives the personal link.
 */
export async function GET(request: Request, { params }: { params: Promise<{ registrationId: string }> }) {
  const { registrationId } = await params;
  const limited = await limitOr429(request, "replay:verify", 30, 10 * 60_000);
  if (limited) return limited;
  const url = new URL(request.url);
  const txRef = url.searchParams.get("tx_ref")?.slice(0, 100) || null;
  const transactionId = url.searchParams.get("transaction_id")?.slice(0, 30) || null;
  const origin = originFromRequest(request);
  const store = getStore();

  const registration = await store.getRegistration(registrationId);
  const webinar = registration ? await store.getWebinar(registration.webinarId) : undefined;
  if (!registration || !webinar) return Response.redirect(`${origin}/`, 303);
  const slug = webinar.slug ?? webinar.id;
  const payment = txRef ? await findReplayPayment(registration.id, txRef) : null;
  if (!payment) return Response.redirect(`${origin}/replay/${slug}`, 303);

  const result = await confirmPayment({ txRef: payment.txRef, transactionId, source: "redirect" });
  if (result.outcome === "successful") {
    const fresh = (await store.getRegistration(registration.id)) ?? registration;
    return Response.redirect(`${origin}/replay/${slug}?r=${encodeURIComponent(fresh.id)}&k=${encodeURIComponent(registrationAccessKey(fresh))}`, 303);
  }
  const state = result.outcome === "pending" ? "pending" : "failed";
  return Response.redirect(`${origin}/replay/${slug}?payment=${state}`, 303);
}
