import { isSameOriginRequest } from "@/lib/server/request-origin";
import { limitOr429 } from "@/lib/server/http";
import { AuthorizationError } from "@/server/auth/authorize";
import { markNotificationsRead } from "@/server/notifications";

export const dynamic = "force-dynamic";

/** Mark everything currently in the bell as read for the signed-in user. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const limited = await limitOr429(request, "notifications:read", 60, 10 * 60_000);
  if (limited) return limited;
  try {
    await markNotificationsRead();
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
