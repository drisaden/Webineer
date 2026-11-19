"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PlanChoice {
  key: "free" | "starter" | "professional" | "business";
  name: string;
  priceMonthly: number;
  description: string;
  features: string[];
}

/**
 * Shown once, before the dashboard, to a new workspace owner who hasn't picked a plan.
 * "Free" records the choice and continues; a paid plan records it and opens the normal checkout.
 */
export function PlanChooser({ plans, paymentsReady, testMode }: { plans: PlanChoice[]; paymentsReady: boolean; testMode: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (done) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [done]);

  if (done) return null;

  const choose = async (plan: PlanChoice["key"]) => {
    setBusy(plan);
    setError(null);
    const res = await fetch("/api/onboarding/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      if (typeof data.checkoutUrl === "string" && data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      setDone(true);
      router.refresh();
      return;
    }
    setError(data.error ?? "We couldn't save your choice. Please try again.");
    setBusy(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#041B5E]/55 p-4 backdrop-blur-md md:items-center md:p-8" data-testid="plan-chooser">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-chooser-title"
        className="plan-chooser-enter w-full max-w-6xl rounded-[2rem] border border-white/60 bg-white p-6 shadow-[0_30px_80px_rgba(4,27,94,0.35)] outline-none md:p-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#EAFBF5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#0F7B52]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Welcome to Webineer
          </span>
          <h2 id="plan-chooser-title" className="mt-4 text-2xl text-primaryText md:text-3xl">Choose how you want to start</h2>
          <p className="mt-2 text-sm text-secondaryText">
            Start free and upgrade whenever you need more, or pick a paid plan now. Paid plans are prepaid for 30 days through Flutterwave and never renew automatically.
          </p>
          {testMode && paymentsReady && <p className="mt-2 text-xs font-medium text-[#8A5A0E]">Payments are in test mode: no real money is charged.</p>}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const free = plan.priceMonthly === 0;
            const featured = plan.key === "professional";
            return (
              <div
                key={plan.key}
                data-plan={plan.key}
                className={cn(
                  "flex flex-col rounded-[1.5rem] border p-5 transition-shadow duration-300 hover:shadow-soft",
                  featured ? "border-[#0AEBCB] bg-[linear-gradient(180deg,rgba(10,235,203,0.12),rgba(255,255,255,0.9))]" : "border-border bg-white",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-primaryText">{plan.name}</h3>
                  {featured && <span className="rounded-full bg-[#041B5E] px-2 py-0.5 text-[11px] font-medium text-white">Popular</span>}
                </div>
                <p className="mt-3 text-3xl font-semibold text-primaryText">
                  {free ? "Free" : `$${plan.priceMonthly}`}
                  {!free && <span className="text-sm font-normal text-secondaryText"> / 30 days</span>}
                </p>
                <p className="mt-2 text-sm text-secondaryText">{plan.description}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-secondaryText">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A36A]" aria-hidden />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant={free ? "secondary" : "primary"}
                  className={cn("mt-5 w-full", free && "border-border")}
                  disabled={busy !== null || (!free && !paymentsReady)}
                  onClick={() => choose(plan.key)}
                >
                  {busy === plan.key ? (free ? "Setting up…" : "Opening checkout…") : free ? "Continue with Free" : `Choose ${plan.name}`}
                </Button>
                {!free && (
                  <p className="mt-2 text-center text-xs text-secondaryText" data-testid="renewal-terms">
                    One payment of ${plan.priceMonthly} for 30 days. <strong className="font-semibold text-primaryText">Does not renew automatically.</strong>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {!paymentsReady && <p className="mt-4 text-center text-sm text-secondaryText">Online payments aren&apos;t set up on this site yet, so only the Free plan can be chosen right now. You can upgrade later from Billing.</p>}
        {error && <p role="alert" className="mt-4 text-center text-sm text-[#B33A3A]">{error}</p>}
        <p className="mt-5 text-center text-xs text-secondaryText">You can change plans at any time from Billing.</p>
      </div>
    </div>
  );
}
