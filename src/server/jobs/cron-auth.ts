import { timingSafeEqual } from "node:crypto";

/** null = CRON_SECRET not configured; otherwise whether the bearer token matches (constant time). */
export function cronAuthorized(request: Request): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
