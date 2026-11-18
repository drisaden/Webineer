import { isSameOriginRequest } from "@/lib/server/request-origin";
import { AuthorizationError, requirePlatformPermission } from "@/server/auth/authorize";
import { getSessionUser } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { getPrisma } from "@/server/db/prisma";
import { json, readBody } from "@/server/earnings/http";
import { setPlatformSetting } from "@/server/earnings/settings";
import { getStore } from "@/server/repositories";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  if (!isSameOriginRequest(request)) return json({ error: "Forbidden" }, 403);
  if (getStore().kind === "mock") return json({ error: "Settings need the database." }, 503);
  try {
    const session = await getSessionUser();
    await requirePlatformPermission(getPrisma(), session, "admin.transactions.manage");
    const body = await readBody(request, session!.id, "admin:payout-settings", 30, 60 * 60_000);
    if ("response" in body) return body.response;
    const out: Record<string, number> = {};
    if (body.data.feePercent !== undefined) out.feePercent = await setPlatformSetting("platform_fee_percent", Number(body.data.feePercent), session!.id);
    if (body.data.holdDays !== undefined) out.holdDays = await setPlatformSetting("payout_hold_days", Number(body.data.holdDays), session!.id);
    await audit({ actorUserId: session!.id, actorEmail: session!.email, action: "payout.settings_changed", targetType: "platform_setting", metadata: out });
    return json({ ok: true, ...out });
  } catch (error) {
    if (error instanceof AuthorizationError) return json({ error: error.message }, error.status);
    return json({ error: error instanceof Error ? error.message : "Please check the values." }, 400);
  }
}
