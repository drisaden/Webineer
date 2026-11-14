import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { getAuthMode } from "@/lib/supabase/config";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Choose a new password · Webineer" };
export const dynamic = "force-dynamic";

/** Reached from the password-recovery email via /auth/confirm, which establishes a short session. */
export default async function ResetPasswordPage() {
  if (getAuthMode() !== "supabase") redirect("/forgot-password");
  if (!(await getSessionUser())) redirect("/login?error=link_invalid");
  return (
    <div className="mx-auto max-w-lg rounded-[2rem] border border-border bg-white p-8 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Account recovery</p>
      <h1 className="mt-3 text-3xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-secondaryText">Use at least 8 characters, including a number.</p>
      <ResetPasswordForm />
    </div>
  );
}
