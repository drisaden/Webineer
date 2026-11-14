import { NextResponse, type NextRequest } from "next/server";
import { getAuthMode } from "@/lib/supabase/config";
import { updateSupabaseSession } from "@/lib/supabase/proxy-session";

/**
 * Session refresh + coarse route protection. Pages, layouts and route handlers
 * still perform their own server-side authorization (defense in depth): this
 * proxy only decides whether there is a signed-in user at all.
 */
const PROTECTED_PAGES = ["/dashboard", "/admin"];
const PROTECTED_API = ["/api/webinars", "/api/account", "/api/organization", "/api/session"];
const GUEST_ONLY = ["/login", "/register"];

const startsWithAny = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const mode = getAuthMode();

  if (mode === "demo") return NextResponse.next();

  if (mode === "unconfigured") {
    if (startsWithAny(path, PROTECTED_API)) {
      return NextResponse.json({ error: "Authentication is not configured on this server." }, { status: 503 });
    }
    if (startsWithAny(path, PROTECTED_PAGES)) {
      const url = new URL("/login", request.url);
      url.searchParams.set("error", "auth_unconfigured");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const { response, userId } = await updateSupabaseSession(request);

  if (!userId && startsWithAny(path, PROTECTED_API)) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!userId && startsWithAny(path, PROTECTED_PAGES)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  if (userId && startsWithAny(path, GUEST_ONLY)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/webinars/:path*",
    "/api/account/:path*",
    "/api/organization",
    "/api/organization/:path*",
    "/api/session/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth/:path*",
  ],
};
