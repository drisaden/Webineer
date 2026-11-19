"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

const input = "h-11 w-full rounded-xl border border-border px-3 text-sm";

export function ReplayPurchase({ slug, title, price, currency, r, k, note }: { slug: string; title: string; price: number; currency: string; r?: string; k?: string; note?: string }) {
  const known = Boolean(r && k);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(note ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const money = new Intl.NumberFormat("en", { style: "currency", currency }).format(price);

  async function buy(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    try {
      const res = await fetch("/api/public/replay/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(known ? { slug, r, k } : { slug, name, email }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setFields(data.fieldErrors ?? {}); setError(data.error ?? "Could not start the payment."); return; }
      if (data.kind === "already_access") { window.location.href = `/replay/${slug}?r=${encodeURIComponent(data.registrationId)}&k=${encodeURIComponent(data.accessKey)}`; return; }
      window.location.href = data.paymentUrl;
    } catch { setError("Could not start the payment. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-10">
      <form onSubmit={buy} data-testid="replay-purchase" className="w-full max-w-md space-y-4 rounded-[2rem] border border-border bg-white p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.16em] text-secondaryText">Replay</p>
        <h1 className="text-xl font-semibold text-primaryText">{title}</h1>
        <p className="text-sm text-secondaryText">Get lifetime access to the recording for a one-time payment of <strong className="text-primaryText">{money}</strong>.</p>
        {!known && (
          <>
            <div>
              <label htmlFor="rp-name" className="mb-1 block text-sm font-medium">Full name</label>
              <input id="rp-name" className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              {fields.name && <p className="mt-1 text-xs text-[#B33A3A]">{fields.name}</p>}
            </div>
            <div>
              <label htmlFor="rp-email" className="mb-1 block text-sm font-medium">Email address</label>
              <input id="rp-email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              {fields.email && <p className="mt-1 text-xs text-[#B33A3A]">{fields.email}</p>}
            </div>
          </>
        )}
        {error && <p role="alert" className="rounded-xl border border-[#F5D7D7] bg-[#FFF6F6] p-3 text-sm text-[#B33A3A]">{error}</p>}
        <button type="submit" disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#16D6B2] text-base font-semibold text-[#101B35] disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Buy replay · {money}
        </button>
        <p className="text-center text-[11px] text-secondaryText">Payments are processed securely. Access is unlocked after the payment is verified.</p>
      </form>
    </main>
  );
}
