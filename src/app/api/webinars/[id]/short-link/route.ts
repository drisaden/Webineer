import { getCurrentUser } from "@/lib/auth/demo-session";
import { limitOr429 } from "@/lib/server/http";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { getAuthMode } from "@/lib/supabase/config";
import { ShortLinkError, getOrCreateShortLink, shortLinkFor } from "@/server/short-links/service";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

async function authed(request: Request, id: string, write: boolean) {
  if (write && !isSameOriginRequest(request)) return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  if (getAuthMode() !== "supabase") return { response: Response.json({ error: "Short links aren't available in the demo workspace." }, { status: 503 }) };
  const user = await getCurrentUser();
  if (!user) return { response: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (!UUID.test(id)) return { response: Response.json({ error: "Webinar not found." }, { status: 404 }) };
  if (write) {
    if (user.role === "analyst") return { response: Response.json({ error: "Your role can't create links." }, { status: 403 }) };
    const limited = await limitOr429(request, "short-link:create", 60, 60 * 60_000, user.id);
    if (limited) return { response: limited };
  }
  return { user };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await authed(request, id, false);
  if (!a.user) return a.response;
  return Response.json({ link: await shortLinkFor(a.user.workspaceId, id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await authed(request, id, true);
  if (!a.user) return a.response;
  try {
    return Response.json({ link: await getOrCreateShortLink(a.user.workspaceId, id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ShortLinkError) return Response.json({ error: error.message }, { status: error.status });
    console.error("[short-link]", error instanceof Error ? error.message : error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
