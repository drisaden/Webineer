import Link from "next/link";
import type { Metadata } from "next";
import { AuthNotice } from "@/components/auth/auth-notice";
import { RegisterForm } from "@/components/auth/auth-forms";
import { getAuthMode } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Create account · Webineer" };

const PLAN_LABELS: Record<string, string> = { free: "Free", starter: "Starter", professional: "Growth", business: "Scale" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const mode = getAuthMode();
  const { plan } = await searchParams;
  const selectedPlan = plan && plan in PLAN_LABELS ? plan : undefined;
  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-border bg-white p-8 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Create account</p>
      <h1 className="mt-3 text-3xl font-semibold">Start building your webinar engine</h1>
      <p className="mt-2 mb-2 text-secondaryText">Create your account and workspace. We&apos;ll email you a link to confirm your address.</p>

      <AuthNotice mode={mode} />
      {selectedPlan && mode !== "demo" && (
        <p className="mt-4 rounded-xl border border-[#BDEBD6] bg-[#EAFBF5] px-4 py-2 text-sm text-[#11724B]">
          You picked the <strong>{PLAN_LABELS[selectedPlan]}</strong> plan. {selectedPlan === "free" ? "It's free to use." : "You'll complete payment after confirming your email."}
        </p>
      )}
      {mode === "demo" ? (
        <Link href="/dashboard" className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#041B5E] px-5 py-3 text-sm font-medium text-white">
          Open the demo workspace
        </Link>
      ) : (
        <RegisterForm plan={selectedPlan} />
      )}

      <p className="mt-5 text-center text-sm text-secondaryText">
        Already have an account? <Link href="/login" className="font-medium text-[#17294B]">Log in</Link>
      </p>
    </div>
  );
}
