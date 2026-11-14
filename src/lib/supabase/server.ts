import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig, SUPABASE_COOKIE_OPTIONS } from "./config";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Uses only the publishable key; the user's session lives in HTTP-only cookies.
 */
export async function createSupabaseServerClient() {
  const config = getSupabasePublicConfig();
  if (!config) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there. The proxy
          // (src/proxy.ts) refreshes the session cookies on the next request.
        }
      },
    },
  });
}
