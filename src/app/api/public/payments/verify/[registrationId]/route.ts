import { originFromRequest } from "@/lib/server/request-origin";
import { getStore } from "@/server/repositories";
import { findTicketPayment } from "@/server/payments/service";
import { verifyRegistrationPayment } from "@/services/registration-service";
import { registrationAccessKey } from "@/services/workflow-notifications";
import { limitOr429 } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Payment gateway return URL. Flutterwave appends `status`, `tx_ref` and `transaction_id`;
 * they are lookup hints only. The transaction is verified server-side before anything is granted.
 */
export async function GET(request: Request, { params }: { params: Promise<{ registrationId: string }> }) {
  const { registrationId } = await params;
  const limited = await limitOr429(request, "payment:verify", 30, 10 * 60_000);
  if (limited) return limited;
  const url = new URL(request.url);
  const txRef = url.searchParams.get("tx_ref")?.slice(0, 100) || null;
  const transactionId = url.searchParams.get("transaction_id")?.slice(0, 30) || null;
  const origin = originFromRequest(request);

  const result = await verifyRegistrationPayment(registrationId, origin, { txRef, transactionId });
  if (!result.webinar) return Response.redirect(`${origin}/`, 303);
  const slug = result.webinar.slug ?? result.webinar.id;
  if (!result.ok || !result.registration) {
    const state = result.pending ? "pending" : "failed";
    const retry = result.pending && txRef ? `&r=${encodeURIComponent(registrationId)}&tx_ref=${encodeURIComponent(txRef)}` : "";
    return Response.redirect(`${origin}/w/${slug}/confirmation?payment=${state}${retry}`, 303);
  }

  // Only the payer's own return (carrying this payment's tx_ref) receives the personal link in the
  // URL; anyone else who guesses the registration id is sent to "check your email".
  if (getStore().kind !== "mock") {
    const payment = await findTicketPayment(result.registration.id, txRef);
    if (!txRef || !payment || payment.txRef !== txRef) return Response.redirect(`${origin}/w/${slug}/confirmation`, 303);
  }
  const key = registrationAccessKey(result.registration);
  return Response.redirect(`${origin}/w/${slug}/confirmation?r=${encodeURIComponent(result.registration.id)}&k=${encodeURIComponent(key)}`, 303);
}
