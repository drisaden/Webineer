import { z } from "zod";
import { KB, readJsonBody } from "@/lib/server/http";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { resolveRoomContext, type RoomContext } from "./context";
import { LiveError } from "./service";

const identity = {
  r: z.string().max(80).optional().nullable(),
  k: z.string().max(200).optional().nullable(),
  asHost: z.boolean().optional(),
  anonKey: z.string().max(60).optional().nullable(),
  anonName: z.string().max(60).optional().nullable(),
};

export const syncBody = z.object({ ...identity, cursor: z.object({ messages: z.number().int().min(0), reactions: z.number().int().min(-1) }).optional() }).strict();
export const actBody = z.object({ ...identity, action: z.object({ type: z.enum(["chat", "question", "reaction", "vote"]) }).passthrough() }).strict();
export const hostBody = z.object({ ...identity, action: z.object({ type: z.string().max(30) }).passthrough() }).strict();

export type RoomGuard = { ok: true; ctx: RoomContext; body: Record<string, unknown> } | { ok: false; response: Response };

/** Origin check, bounded JSON body, per-viewer rate limit and room access, in that order. */
export async function guardRoomRequest(request: Request, slug: string, schema: z.ZodType, bucket: { name: string; limit: number; windowMs: number }): Promise<RoomGuard> {
  if (!isSameOriginRequest(request)) return { ok: false, response: new Response(null, { status: 403 }) };
  const read = await readJsonBody(request, 4 * KB);
  if (!read.ok) return { ok: false, response: read.response };
  const parsed = schema.safeParse(read.data);
  if (!parsed.success) return { ok: false, response: Response.json({ error: "Invalid request." }, { status: 400 }) };
  const body = parsed.data as Record<string, unknown> & { r?: string | null; k?: string | null; asHost?: boolean; anonKey?: string | null; anonName?: string | null };

  const who = body.asHost ? "host" : (body.r ?? body.anonKey ?? request.headers.get("x-forwarded-for") ?? "unknown");
  const limited = rateLimit(`live:${bucket.name}:${slug}:${who}`, bucket.limit, bucket.windowMs);
  if (!limited.allowed) return { ok: false, response: tooManyRequests(limited, "You're going a little fast. Try again in a moment.") };

  const result = await resolveRoomContext({ slug, r: body.r, k: body.k, asHost: body.asHost, anonKey: body.anonKey, anonName: body.anonName });
  if (!result.ok) return { ok: false, response: Response.json({ error: result.error }, { status: result.status, headers: { "Cache-Control": "no-store" } }) };
  return { ok: true, ctx: result.ctx, body };
}

export function liveErrorResponse(error: unknown): Response {
  if (error instanceof LiveError) return Response.json({ error: error.message }, { status: error.status });
  console.error("[live-room]", error instanceof Error ? error.message : error);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
