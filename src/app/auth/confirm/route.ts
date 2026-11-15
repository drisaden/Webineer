import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { checkRateLimit, clientIp } from "@/lib/security/rate-limit";
import { getAuthMode, safeNextPath } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultOrganization, syncUserProfile } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/**
 * Email link landing (confirmation, password recovery, invites). Configure the
 * Supabase email templates to link here with the token hash, e.g.
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}
 * This works even when the link is opened in a different browser.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!(await checkRateLimit(`auth:confirm:${clientIp(request)}`, 30, 10 * 60_000)).allowed) redirect("/login?error=rate_limited");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (getAuthMode() !== "supabase" || !tokenHash || !type || !OTP_TYPES.includes(type)) {
    redirect("/login?error=link_invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error || !data.user) {
    // Log why (never the token): tells an expired/already-used link apart from a configuration problem.
    console.warn("[auth] link verification failed", type, error?.code ?? "no_user", error?.message ?? "");
    redirect("/login?error=link_invalid");
  }

  try {
    const db = getPrisma();
    const { profile, workspaceName, planPreselected } = await syncUserProfile(db, data.user);
    await ensureDefaultOrganization(db, { id: profile.id, email: profile.email, name: profile.name }, workspaceName, planPreselected);
    await db.auditLog.create({ data: { action: `auth.link_verified.${type}`, actorUserId: profile.id, actorEmail: profile.email } });
  } catch (err) {
    console.error("[auth] profile sync after link verification failed", err);
    redirect("/account-unavailable");
  }

  if (type === "recovery") redirect("/reset-password");
  redirect(safeNextPath(url.searchParams.get("next")));
}
