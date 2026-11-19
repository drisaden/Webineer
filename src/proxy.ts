import { NextResponse, type NextRequest } from "next/server";
import { getAuthMode } from "@/lib/supabase/config";
import { updateSupabaseSession } from "@/lib/supabase/proxy-session";
import { isValidCode, shortHost } from "@/lib/short-links/code";

/**
 * Session refresh + coarse route protection. Pages, layouts and route handlers
 * still perform their own server-side authorization (defense in depth): this
 * proxy only decides whether there is a signed-in user at all.
 */
const PROTECTED_PAGES = ["/dashboard", "/admin"];
const PROTECTED_API = ["/api/webinars", "/api/account", "/api/organization", "/api/session"];
const GUEST_ONLY = ["/login", "/register"];

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password", "/auth"];

const startsWithAny = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/**
 * On the short domain (SHORT_LINK_BASE_URL), /{code} is the short link and anything else goes to the app.
 * Returns a response when the request is for the short domain, or null for every other host.
 */
function handleShortDomain(request: NextRequest, path: string): NextResponse | null {
  const short = shortHost();
  if (!short) return null;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  if (host !== short) return null;
  const code = path.slice(1).toLowerCase();
  if (path !== "/" && !code.includes("/") && isValidCode(code)) {
    const url = request.nextUrl.clone();
    url.pathname = `/s/${code}`;
    return NextResponse.rewrite(url);
  }
  // Set at build time (it is also the app's own public address).
  const app = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "").replace(/\/+$/, "");
  // A hand-built redirect, so the app's address is always sent in full (never shortened to "/" on the short host).
  return new NextResponse(null, { status: 302, headers: { Location: app || "/" } });
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const onShortDomain = handleShortDomain(request, path);
  if (onShortDomain) return onShortDomain;
  // The matcher also lets single-segment paths through (for short links), so pass everything else straight on.
  if (!startsWithAny(path, [...PROTECTED_PAGES, ...PROTECTED_API, ...AUTH_PAGES])) return NextResponse.next();
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
    // Short links on the short domain: "/" and "/{code}".
    "/",
    "/:code([a-zA-Z0-9]{4,16})",
  ],
};
