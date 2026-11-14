/**
 * Authentication mode.
 * - "supabase": NEXT_PUBLIC_SUPABASE_URL + publishable key configured (production path).
 * - "demo": no Supabase config AND NEXT_PUBLIC_DEMO_MODE=true AND not running on Vercel
 *   (local development only). Uses the mock demo user and sample data. Never active on any
 *   Vercel deployment, previews included, so a public URL can never grant the demo admin.
 * - "unconfigured": neither; protected areas are closed.
 */
export type AuthMode = "supabase" | "demo" | "unconfigured";

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // New-style publishable key (sb_publishable_...) with fallback to the legacy anon key.
  const publishableKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  if (!url || !publishableKey) return null;
  return { url: url.replace(/\/+$/, ""), publishableKey };
}

export function getAuthMode(): AuthMode {
  if (getSupabasePublicConfig()) return "supabase";
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" && !process.env.VERCEL && !process.env.VERCEL_ENV) return "demo";
  return "unconfigured";
}

/** Only allow same-site relative redirects after auth (prevents open redirects). */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  try {
    const url = new URL(value, "http://local");
    if (url.origin !== "http://local") return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

/**
 * Session cookie options. All Supabase auth happens on the server, so the
 * session cookies are HttpOnly (not readable by page scripts) and Secure in
 * production. Do not add a browser Supabase client that needs to read them.
 */
export const SUPABASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
