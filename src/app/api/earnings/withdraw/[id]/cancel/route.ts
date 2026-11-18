import { audit } from "@/server/audit";
import { errorResponse, json, requireMember } from "@/server/earnings/http";
import { cancelPayout } from "@/server/earnings/service";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const who = await requireMember(request, "org.billing.manage", true);
  if ("response" in who) return who.response;
  if (!UUID.test(id)) return json({ error: "Request not found." }, 404);
  try {
    await cancelPayout(who.app.organization.id, id);
    await audit({ organizationId: who.app.organization.id, actorUserId: who.app.profile.id, actorEmail: who.app.profile.email, action: "payout.cancelled", targetType: "payout", targetId: id });
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
