import { guardRoomRequest, liveErrorResponse, syncBody } from "@/server/live/http";
import { syncRoom } from "@/server/live/service";

export const dynamic = "force-dynamic";

/** Live room poll: heartbeat plus everything new since the client's cursors. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guard = await guardRoomRequest(request, slug, syncBody, { name: "sync", limit: 40, windowMs: 30_000 });
  if (!guard.ok) return guard.response;
  try {
    const cursor = (guard.body.cursor as { messages: number; reactions: number } | undefined) ?? { messages: 0, reactions: -1 };
    return Response.json(await syncRoom(guard.ctx, cursor), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return liveErrorResponse(error);
  }
}
