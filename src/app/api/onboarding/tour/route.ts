import { isSameOriginRequest } from "@/lib/server/request-origin";
import { limitOr429 } from "@/lib/server/http";
import { AuthorizationError } from "@/server/auth/authorize";
import { completeTour } from "@/server/onboarding";

export const dynamic = "force-dynamic";

/** Record that the signed-in user finished or skipped the product tour. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const limited = await limitOr429(request, "onboarding:tour", 30, 10 * 60_000);
  if (limited) return limited;
  try {
    await completeTour();
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
