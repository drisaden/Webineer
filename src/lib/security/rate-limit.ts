import { createHash } from "node:crypto";

/**
 * Rate limiting.
 * - `checkRateLimit` (use this): shared fixed-window counters in Postgres (rate_limits), so
 *   limits hold across all serverless instances. Demo mode / no database uses memory.
 * - `rateLimit`: the in-memory limiter, also the fallback if the database is unreachable.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const g = globalThis as typeof globalThis & { __webineerRateLimit?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (g.__webineerRateLimit ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  return { allowed: true, retryAfterSeconds: 0 };
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Shared limiter: one atomic upsert per check. Keys are hashed (no emails/IPs stored). */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const [{ getAuthMode }, { isDatabaseConfigured, getPrisma }] = await Promise.all([import("@/lib/supabase/config"), import("@/server/db/prisma")]);
  if (getAuthMode() === "demo" || !isDatabaseConfigured()) return rateLimit(key, limit, windowMs);
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const hashed = createHash("sha256").update(key).digest("hex").slice(0, 40);
  try {
    const [row] = await getPrisma().$queryRaw<{ count: number }[]>`
      INSERT INTO rate_limits (key, window_start, count) VALUES (${hashed}, ${windowStart}, 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start = EXCLUDED.window_start THEN rate_limits.count + 1 ELSE 1 END,
        window_start = EXCLUDED.window_start
      RETURNING count`;
    if (row.count > limit) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowStart.getTime() + windowMs - Date.now()) / 1000)) };
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    console.error("[rate-limit] database unavailable, using in-memory limiter", error instanceof Error ? error.message : error);
    return rateLimit(key, limit, windowMs);
  }
}

/** 429 response with Retry-After. */
export function tooManyRequests(result: RateLimitResult, message = "Too many requests. Please wait a moment and try again."): Response {
  return Response.json({ error: message }, { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds || 60) } });
}

/**
 * Client IP for rate limiting. Prefers headers set by the hosting platform
 * (Vercel sets x-real-ip / x-forwarded-for itself). When self-hosting, put the
 * app behind a proxy that overwrites these headers, otherwise they can be spoofed.
 */
export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
