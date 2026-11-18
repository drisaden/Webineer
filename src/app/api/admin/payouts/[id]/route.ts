import { isSameOriginRequest } from "@/lib/server/request-origin";
import { AuthorizationError, requirePlatformPermission } from "@/server/auth/authorize";
import { getSessionUser } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { getPrisma } from "@/server/db/prisma";
import { errorResponse, json, readBody } from "@/server/earnings/http";
import { approvePayout, markPayoutPaid, rejectPayout } from "@/server/earnings/service";
import { getStore } from "@/server/repositories";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSameOriginRequest(request)) return json({ error: "Forbidden" }, 403);
  if (getStore().kind === "mock") return json({ error: "Payouts need the database." }, 503);
  try {
    const session = await getSessionUser();
    await requirePlatformPermission(getPrisma(), session, "admin.transactions.manage");
    if (!UUID.test(id)) return json({ error: "Request not found." }, 404);
    const body = await readBody(request, session!.id, "admin:payout", 60, 60 * 60_000);
    if ("response" in body) return body.response;
    const action = body.data.action;
    const text = (v: unknown) => (typeof v === "string" ? v : "");
    let row;
    if (action === "approve") row = await approvePayout(id, session!.id);
    else if (action === "paid") row = await markPayoutPaid(id, session!.id, text(body.data.reference));
    else if (action === "reject") row = await rejectPayout(id, session!.id, text(body.data.note));
    else return json({ error: "Unknown action." }, 400);
    await audit({ organizationId: row.organizationId, actorUserId: session!.id, actorEmail: session!.email, action: `payout.${action}`, targetType: "payout", targetId: id, metadata: { amount: Number(row.amount), currency: row.currency } });
    return json({ ok: true, status: row.status });
  } catch (error) {
    if (error instanceof AuthorizationError) return json({ error: error.message }, error.status);
    return errorResponse(error);
  }
}
