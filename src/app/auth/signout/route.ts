import { redirect } from "next/navigation";
import { audit } from "@/server/audit";
import { getAuthMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { ACTIVE_ORG_COOKIE } from "@/server/auth/session";
import { cookies } from "next/headers";

/** POST-only so a cross-site link or image can't sign users out. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return new Response("Forbidden", { status: 403 });
  if (getAuthMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getClaims();
    await supabase.auth.signOut();
    const claims = data?.claims as { sub?: string; email?: string } | undefined;
    if (claims?.sub) await audit({ action: "auth.sign_out", actorUserId: claims.sub, actorEmail: claims.email ?? null });
  }
  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  redirect("/login?signed_out=1");
}
