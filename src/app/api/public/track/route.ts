import { z } from "zod";
import { checkRateLimit, clientIp } from "@/lib/security/rate-limit";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { getStore } from "@/server/repositories";
import { getPublishedWebinarByPublicId } from "@/services/registration-service";
import { KB, readJsonBody } from "@/lib/server/http";

const schema = z.object({
  publicId: z.string().min(6).max(40).regex(/^[A-Za-z0-9]+$/),
  source: z.enum(["hosted", "inline", "popup", "button", "direct"]),
});

/** Records registration page/form views (client beacon, so prefetches don't count). */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403 });
  const limit = await checkRateLimit(`track:${clientIp(request)}`, 60, 60_000);
  if (!limit.allowed) return new Response(null, { status: 429 });
  const read = await readJsonBody(request, 2 * KB);
  if (!read.ok) return new Response(null, { status: read.response.status });
  const body: unknown = read.data;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });
  const webinar = await getPublishedWebinarByPublicId(parsed.data.publicId);
  if (!webinar) return new Response(null, { status: 204 });
  // Same store as registrations (database outside demo mode), so funnels add up.
  await getStore().recordEvent({ workspaceId: webinar.workspaceId, webinarId: webinar.id, eventType: "landing_page_viewed", source: parsed.data.source });
  return new Response(null, { status: 204 });
}
