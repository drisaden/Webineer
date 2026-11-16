import { guardRoomRequest, hostBody, liveErrorResponse } from "@/server/live/http";
import { performHostAction } from "@/server/live/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guard = await guardRoomRequest(request, slug, hostBody, { name: "host", limit: 60, windowMs: 30_000 });
  if (!guard.ok) return guard.response;
  try {
    return Response.json(await performHostAction(guard.ctx, guard.body.action as { type: string }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return liveErrorResponse(error);
  }
}
