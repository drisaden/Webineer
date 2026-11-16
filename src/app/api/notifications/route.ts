import { limitOr429 } from "@/lib/server/http";
import { AuthorizationError } from "@/server/auth/authorize";
import { listNotifications } from "@/server/notifications";

export const dynamic = "force-dynamic";

/** Recent workspace activity for the notification bell, with an unread count for the signed-in user. */
export async function GET(request: Request) {
  const limited = await limitOr429(request, "notifications:list", 120, 10 * 60_000);
  if (limited) return limited;
  try {
    return Response.json(await listNotifications(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
