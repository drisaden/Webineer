"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Starts a Flutterwave checkout for a plan and sends the browser to it. */
/** `price` is the display amount (e.g. "$29"). The payment terms are shown right beside the button. */
export function UpgradeButton({ plan, label, price }: { plan: string; label: string; price?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok && typeof data.checkoutUrl === "string") {
      window.location.assign(data.checkoutUrl);
      return;
    }
    setError(data.error ?? "Couldn't start checkout. Please try again.");
    setBusy(false);
  };
  return (
    <div className="space-y-2">
      <Button type="button" className="w-full" onClick={start} disabled={busy}>
        {busy ? "Opening checkout…" : label}
      </Button>
      <p className="text-xs text-secondaryText" data-testid="renewal-terms">
        {price ? `One payment of ${price} for 30 days. ` : "One payment for 30 days. "}
        <strong className="font-semibold text-primaryText">Does not renew automatically</strong>; you&apos;re only charged again if you choose to pay again.{" "}
        <Link href="/terms#plans-payment-and-renewal" className="underline">Terms</Link>
      </p>
      {error && <p role="alert" className="text-xs text-[#B33A3A]">{error}</p>}
    </div>
  );
}
