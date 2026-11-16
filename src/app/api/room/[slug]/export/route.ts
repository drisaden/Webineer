import { resolveRoomContext } from "@/server/live/context";
import { liveErrorResponse } from "@/server/live/http";
import { exportTranscript } from "@/server/live/service";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/** Business plan: chat and Q&A as a CSV download for the host. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const limited = rateLimit(`live:export:${slug}`, 10, 60_000);
  if (!limited.allowed) return tooManyRequests(limited);
  const result = await resolveRoomContext({ slug, asHost: true });
  if (!result.ok || !result.ctx.actor.isHost) return new Response(null, { status: result.ok ? 403 : result.status });
  try {
    const csv = await exportTranscript(result.ctx);
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}-chat-and-qa.csv"`, "Cache-Control": "no-store" } });
  } catch (error) {
    return liveErrorResponse(error);
  }
}
