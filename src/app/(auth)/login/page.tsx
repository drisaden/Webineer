import Link from "next/link";
import type { Metadata } from "next";
import { AuthNotice } from "@/components/auth/auth-notice";
import { LoginForm } from "@/components/auth/auth-forms";
import { getAuthMode, safeNextPath } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in · Webineer" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; signed_out?: string }> }) {
  const query = await searchParams;
  const mode = getAuthMode();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-[2rem] border border-border bg-white p-8 shadow-soft">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">{mode === "demo" ? "Demo access" : "Sign in"}</p>
          <h1 className="mt-3 text-3xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-secondaryText">Sign in to manage your webinars, registrations and automations.</p>
        </div>

        <AuthNotice code={query.error ?? (query.signed_out ? "signed_out" : undefined)} mode={mode} />
        <LoginForm next={safeNextPath(query.next)} demo={mode === "demo"} />

        <p className="mt-6 text-center text-sm text-secondaryText">
          Don&apos;t have an account? <Link href="/register" className="font-medium text-[#17294B]">Create one</Link>
        </p>
      </div>

      <div className="rounded-[2rem] border border-border bg-[#101B35] p-8 text-white shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#B9F0E7]">What you can do</p>
        <h2 className="mt-3 text-3xl font-semibold">Launch webinar ops in a few clicks</h2>
        <ul className="mt-6 space-y-4 text-sm text-white/75">
          <li>• Create branded webinar experiences around external video sources</li>
          <li>• Review registration and attendance trends across campaigns</li>
          <li>• Build landing pages and automate reminder sequences</li>
          <li>• Manage upcoming, automated and replay webinar programs</li>
        </ul>
      </div>
    </div>
  );
}
