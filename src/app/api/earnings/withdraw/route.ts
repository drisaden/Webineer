import { audit } from "@/server/audit";
import { errorResponse, json, passwordIsCorrect, readBody, requireMember } from "@/server/earnings/http";
import { requestPayout, type Currency } from "@/server/earnings/service";

export const dynamic = "force-dynamic";
const CURRENCIES = ["NGN", "USD", "EUR", "GBP"];

export async function POST(request: Request) {
  const who = await requireMember(request, "org.billing.manage", true);
  if ("response" in who) return who.response;
  const body = await readBody(request, who.app.profile.id, "earnings:withdraw", 10, 60 * 60_000);
  if ("response" in body) return body.response;
  const d = body.data;
  const key = typeof d.idempotencyKey === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(d.idempotencyKey) ? d.idempotencyKey : null;
  if (!key || typeof d.amount !== "number" || typeof d.currency !== "string" || !CURRENCIES.includes(d.currency)) return json({ error: "Please check the form and try again." }, 400);
  try {
    if (!(await passwordIsCorrect(who.app.profile.email, d.password))) return json({ error: "That password isn't right." }, 403);
    const payout = await requestPayout({ organizationId: who.app.organization.id, userId: who.app.profile.id, amount: d.amount, currency: d.currency as Currency, idempotencyKey: `${who.app.organization.id}:${key}` });
    await audit({ organizationId: who.app.organization.id, actorUserId: who.app.profile.id, actorEmail: who.app.profile.email, action: "payout.requested", targetType: "payout", targetId: payout.id, metadata: { amount: Number(payout.amount), currency: payout.currency } });
    return json({ ok: true, id: payout.id, status: payout.status });
  } catch (error) {
    return errorResponse(error);
  }
}
