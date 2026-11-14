import Link from "next/link";
import type { Metadata } from "next";
import { AuthNotice } from "@/components/auth/auth-notice";
import { RegisterForm } from "@/components/auth/auth-forms";
import { getAuthMode } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Create account · Webineer" };

export default function RegisterPage() {
  const mode = getAuthMode();
  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-border bg-white p-8 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Create account</p>
      <h1 className="mt-3 text-3xl font-semibold">Start building your webinar engine</h1>
      <p className="mt-2 mb-2 text-secondaryText">Create your account and workspace. We&apos;ll email you a link to confirm your address.</p>

      <AuthNotice mode={mode} />
      {mode === "demo" ? (
        <Link href="/dashboard" className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#041B5E] px-5 py-3 text-sm font-medium text-white">
          Open the demo workspace
        </Link>
      ) : (
        <RegisterForm />
      )}

      <p className="mt-5 text-center text-sm text-secondaryText">
        Already have an account? <Link href="/login" className="font-medium text-[#17294B]">Log in</Link>
      </p>
    </div>
  );
}
