import Link from "next/link";
import type { Metadata } from "next";
import { AuthNotice } from "@/components/auth/auth-notice";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { getAuthMode } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Reset password · Webineer" };

export default function ForgotPasswordPage() {
  const mode = getAuthMode();
  return (
    <div className="mx-auto max-w-lg rounded-[2rem] border border-border bg-white p-8 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Account recovery</p>
      <h1 className="mt-3 text-3xl font-semibold">Reset your password</h1>
      <p className="mt-2 mb-2 text-secondaryText">Enter the email address linked to your Webineer account.</p>
      <AuthNotice mode={mode} />
      <ForgotPasswordForm />
      <p className="mt-5 text-center text-sm text-secondaryText">
        Remembered it? <Link href="/login" className="font-medium text-[#17294B]">Back to sign in</Link>
      </p>
    </div>
  );
}
