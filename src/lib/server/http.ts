import { checkRateLimit, clientIp, tooManyRequests } from "@/lib/security/rate-limit";

/**
 * Small request guards shared by API routes: bounded JSON bodies and rate limits.
 */

export type JsonResult<T = unknown> = { ok: true; data: T } | { ok: false; response: Response };

/** Read a JSON body without ever buffering more than `maxBytes`. Empty body -> `fallback` when given. */
export async function readJsonBody<T = unknown>(request: Request, maxBytes: number, fallback?: T): Promise<JsonResult<T>> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return { ok: false, response: Response.json({ error: "Request body too large." }, { status: 413 }) };
  let text = "";
  if (request.body) {
    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, response: Response.json({ error: "Request body too large." }, { status: 413 }) };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  }
  if (!text.trim()) {
    if (fallback !== undefined) return { ok: true, data: fallback };
    return { ok: false, response: Response.json({ error: "Invalid JSON body." }, { status: 400 }) };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, response: Response.json({ error: "Invalid JSON body." }, { status: 400 }) };
  }
}

/** Raw text body (for signature checks) bounded to `maxBytes`; null when larger. */
export async function readTextBody(request: Request, maxBytes: number): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/** Returns a 429 response when over the limit, otherwise null. `subject` defaults to the client IP. */
export async function limitOr429(request: Request, name: string, limit: number, windowMs: number, subject?: string): Promise<Response | null> {
  const result = await checkRateLimit(`${name}:${subject ?? clientIp(request)}`, limit, windowMs);
  return result.allowed ? null : tooManyRequests(result);
}

export const KB = 1024;
