import { isSameOriginRequest } from "@/lib/server/request-origin";
import { getAuthMode } from "@/lib/supabase/config";
import { audit } from "@/server/audit";
import { getSessionUser } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";
import { profileSchema } from "@/server/settings";
import { KB, limitOr429, readJsonBody } from "@/lib/server/http";

/** Update the signed-in user's own display profile. Email changes go through Supabase Auth. */
export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (getAuthMode() !== "supabase") return Response.json({ error: "Profiles can't be changed in demo mode." }, { status: 403 });
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const limited = await limitOr429(request, "settings:profile", 30, 10 * 60_000);
  if (limited) return limited;
  const body = await readJsonBody(request, 8 * KB);
  if (!body.ok) return body.response;
  const parsed = profileSchema.safeParse(body.data);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile." }, { status: 400 });
  const user = await getPrisma().user.update({ where: { id: session.id }, data: { name: parsed.data.name, title: parsed.data.title || null } });
  await audit({ actorUserId: session.id, actorEmail: session.email, action: "profile.update", targetType: "user", targetId: session.id });
  return Response.json({ name: user.name, title: user.title ?? "" });
}
