import { z } from "zod";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { AuthorizationError } from "@/server/auth/authorize";
import { memberRoleSchema, updateMemberRole } from "@/server/settings";
import { KB, limitOr429, readJsonBody } from "@/lib/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { userId } = await params;
  if (!z.string().uuid().safeParse(userId).success) return Response.json({ error: "Member not found." }, { status: 404 });
  const limited = await limitOr429(request, "settings:member", 30, 10 * 60_000);
  if (limited) return limited;
  const body = await readJsonBody(request, 8 * KB);
  if (!body.ok) return body.response;
  const parsed = memberRoleSchema.safeParse(body.data);
  if (!parsed.success) return Response.json({ error: "Invalid role." }, { status: 400 });
  try {
    const m = await updateMemberRole(userId, parsed.data.role);
    return Response.json({ userId: m.userId, role: m.role });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
