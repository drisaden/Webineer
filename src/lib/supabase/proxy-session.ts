import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig, SUPABASE_COOKIE_OPTIONS } from "./config";

/**
 * Refreshes the Supabase session cookies for every matched request and returns
 * the verified user id (or null). Verification uses getClaims(), which checks
 * the JWT signature (locally with asymmetric keys, or via the Auth server).
 */
export async function updateSupabaseSession(request: NextRequest): Promise<{ response: NextResponse; userId: string | null }> {
  const config = getSupabasePublicConfig();
  let response = NextResponse.next({ request });
  if (!config) return { response, userId: null };

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Do not put code between createServerClient and getClaims (session refresh ordering).
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return { response, userId: typeof sub === "string" ? sub : null };
}
