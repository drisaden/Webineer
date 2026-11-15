import { redirect } from "next/navigation";
import { getAuthMode, safeNextPath } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultOrganization, syncUserProfile } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";

/**
 * PKCE code exchange (Supabase's default {{ .ConfirmationURL }} links and
 * OAuth). Must be opened in the browser that started the flow.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (getAuthMode() !== "supabase" || !code) redirect("/login?error=link_invalid");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) redirect("/login?error=link_invalid");

  try {
    const db = getPrisma();
    const { profile, workspaceName, planPreselected } = await syncUserProfile(db, data.user);
    await ensureDefaultOrganization(db, { id: profile.id, email: profile.email, name: profile.name }, workspaceName, planPreselected);
  } catch (err) {
    console.error("[auth] profile sync after code exchange failed", err);
    redirect("/account-unavailable");
  }
  redirect(safeNextPath(url.searchParams.get("next")));
}
