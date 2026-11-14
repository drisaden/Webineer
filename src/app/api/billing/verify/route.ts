import { originFromRequest } from "@/lib/server/request-origin";
import { confirmPayment } from "@/server/payments/service";
import { getPrisma } from "@/server/db/prisma";
import { getAuthMode } from "@/lib/supabase/config";
import { limitOr429 } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Flutterwave return URL for plan purchases. Verified server-side; query values are hints only. */
export async function GET(request: Request) {
  const origin = originFromRequest(request);
  const limited = await limitOr429(request, "billing:verify", 30, 10 * 60_000);
  if (limited) return limited;
  const url = new URL(request.url);
  const txRef = url.searchParams.get("tx_ref")?.slice(0, 100);
  const transactionId = url.searchParams.get("transaction_id")?.slice(0, 30) || null;
  if (getAuthMode() !== "supabase" || !txRef) return Response.redirect(`${origin}/dashboard/billing`, 303);
  const payment = await getPrisma().payment.findUnique({ where: { txRef }, select: { purpose: true } });
  if (!payment || payment.purpose !== "PLATFORM_SUBSCRIPTION") return Response.redirect(`${origin}/dashboard/billing?payment=failed`, 303);
  const result = await confirmPayment({ txRef, transactionId, source: "redirect" });
  const state = result.outcome === "successful" ? "success" : result.outcome === "pending" ? "pending" : "failed";
  return Response.redirect(`${origin}/dashboard/billing?payment=${state}`, 303);
}
