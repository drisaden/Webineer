import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { getAuthMode } from "@/lib/supabase/config";
import { resolveShortLink } from "@/server/short-links/service";

export const dynamic = "force-dynamic";

const appOrigin = () => (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");

/** Short link: /s/{code} sends people to the webinar's public page. Unknown codes go to the home page. */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // Stops anyone trying codes in bulk. A person following links never gets near this.
  if (!rateLimit(`short:${ip}`, 120, 60_000).allowed) return new NextResponse("Too many requests", { status: 429 });
  let target = appOrigin();
  if (getAuthMode() === "supabase") {
    const found = await resolveShortLink(code.toLowerCase());
    if (found) target = `${appOrigin()}/w/${encodeURIComponent(found.slug)}`;
  }
  return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
