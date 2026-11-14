import { isSameOriginRequest, originFromRequest } from "@/lib/server/request-origin";
import { AuthorizationError } from "@/server/auth/authorize";
import { beginSubscriptionCheckout, checkoutSchema } from "@/server/billing";
import { PaymentError } from "@/server/payments/service";
import { KB, limitOr429, readJsonBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Start a plan purchase. Owners only (org.billing.manage). Returns the Flutterwave checkout link. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const limited = await limitOr429(request, "billing:checkout", 10, 10 * 60_000);
  if (limited) return limited;
  const body = await readJsonBody(request, 2 * KB);
  if (!body.ok) return body.response;
  const parsed = checkoutSchema.safeParse(body.data);
  if (!parsed.success) return Response.json({ error: "Choose a valid plan." }, { status: 400 });
  try {
    const checkout = await beginSubscriptionCheckout(parsed.data.plan, originFromRequest(request));
    return Response.json({ checkoutUrl: checkout.checkoutUrl });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof PaymentError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
