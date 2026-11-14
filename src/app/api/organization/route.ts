import { isSameOriginRequest } from "@/lib/server/request-origin";
import { AuthorizationError } from "@/server/auth/authorize";
import { organizationSchema, updateOrganization } from "@/server/settings";
import { KB, limitOr429, readJsonBody } from "@/lib/server/http";

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const limited = await limitOr429(request, "settings:org", 30, 10 * 60_000);
  if (limited) return limited;
  const body = await readJsonBody(request, 8 * KB);
  if (!body.ok) return body.response;
  const parsed = organizationSchema.safeParse(body.data);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, { status: 400 });
  try {
    const org = await updateOrganization(parsed.data);
    return Response.json({ name: org.name, timezone: org.timezone });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
