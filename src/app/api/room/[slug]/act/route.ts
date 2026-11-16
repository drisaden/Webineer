import { actBody, guardRoomRequest, liveErrorResponse } from "@/server/live/http";
import { performAction } from "@/server/live/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guard = await guardRoomRequest(request, slug, actBody, { name: "act", limit: 40, windowMs: 10_000 });
  if (!guard.ok) return guard.response;
  try {
    return Response.json(await performAction(guard.ctx, guard.body.action as { type: string }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return liveErrorResponse(error);
  }
}
