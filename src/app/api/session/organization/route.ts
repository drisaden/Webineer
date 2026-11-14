import { cookies } from "next/headers";
import { z } from "zod";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { getAuthMode } from "@/lib/supabase/config";
import { AuthorizationError, requireOrgPermission } from "@/server/auth/authorize";
import { ACTIVE_ORG_COOKIE, getSessionUser } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";
import { KB, limitOr429, readJsonBody } from "@/lib/server/http";
import { audit } from "@/server/audit";

const schema = z.object({ organizationId: z.string().uuid() });

/** Switch the active organization. The cookie is only a preference; every request re-checks membership. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (getAuthMode() !== "supabase") return Response.json({ error: "Not available in this mode." }, { status: 404 });
  const limited = await limitOr429(request, "session:org", 30, 10 * 60_000);
  if (limited) return limited;
  const body = await readJsonBody(request, 2 * KB);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return Response.json({ error: "Invalid organization." }, { status: 400 });
  try {
    const ctx = await requireOrgPermission(getPrisma(), await getSessionUser(), parsed.data.organizationId, "org.view");
    await audit({ action: "session.organization_switched", organizationId: ctx.organizationId, actorUserId: ctx.user.id, actorEmail: ctx.user.email });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
  (await cookies()).set(ACTIVE_ORG_COOKIE, parsed.data.organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return Response.json({ ok: true });
}
