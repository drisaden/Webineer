"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CALLBACK_WINDOWS, SUPPORT_CATEGORIES, SUPPORT_LIMITS, type SupportTicketView } from "@/lib/support/types";
import { api } from "./api";

const labelCls = "mb-1 block text-sm font-medium text-primaryText";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-secondaryText">{hint}</span>}
    </label>
  );
}

function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={busy} className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#041B5E] px-5 text-sm font-medium text-white disabled:opacity-60 sm:w-auto">
      {busy ? "Sending…" : children}
    </button>
  );
}

function Sent({ number, emailed, extra }: { number: string; emailed: boolean; extra?: string }) {
  return (
    <div className="rounded-2xl border border-[#BFE9E0] bg-[#E9FBF7] p-4 text-sm text-primaryText" role="status" data-testid="support-sent">
      <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-[#0F7B52]" aria-hidden /> Request received · {number}</p>
      <p className="mt-1 text-secondaryText">
        {extra ? `${extra} ` : ""}
        {emailed ? "We've emailed you a confirmation with this reference." : "We couldn't send a confirmation email right now, but your request is saved and the team will see it."}
      </p>
    </div>
  );
}

export function StartChatForm({ onStarted }: { onStarted: (ticket: SupportTicketView) => void }) {
  const [category, setCategory] = useState<string>("other");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await api<{ ticket: SupportTicketView }>("/api/support/tickets", { method: "POST", body: { channel: "CHAT", category, message } });
        setBusy(false);
        if (res.ok) onStarted(res.data.ticket);
        else setError(res.error);
      }}
    >
      <Field label="What do you need help with?">
        <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Topic">
          {SUPPORT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Your message">
        <textarea className="input-field min-h-24" required maxLength={SUPPORT_LIMITS.message} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what's happening" />
      </Field>
      {error && <p className="text-sm text-[#B42318]" role="alert">{error}</p>}
      <Submit busy={busy}>Start chat</Submit>
    </form>
  );
}

export function CallbackForm() {
  const [phone, setPhone] = useState("");
  const [window_, setWindow] = useState<string>(CALLBACK_WINDOWS[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: string; emailed: boolean } | null>(null);
  if (done) return <Sent number={done.number} emailed={done.emailed} extra="An agent will call you as soon as one is free." />;
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await api<{ ticket: SupportTicketView; emailed: boolean }>("/api/support/tickets", { method: "POST", body: { channel: "CALLBACK", phone, callbackWindow: window_, message, category: "other" } });
        setBusy(false);
        if (res.ok) setDone({ number: res.data.ticket.number, emailed: res.data.emailed });
        else setError(res.error);
      }}
    >
      <Field label="Phone number" hint="Include the country code, for example +234 801 234 5678.">
        <input className="input-field" type="tel" inputMode="tel" autoComplete="tel" required maxLength={SUPPORT_LIMITS.phone} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 801 234 5678" />
      </Field>
      <Field label="Best time to call">
        <select className="input-field" value={window_} onChange={(e) => setWindow(e.target.value)} aria-label="Best time to call">
          {CALLBACK_WINDOWS.map((w) => <option key={w}>{w}</option>)}
        </select>
      </Field>
      <Field label="What's it about?">
        <textarea className="input-field min-h-20" required maxLength={SUPPORT_LIMITS.message} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="A sentence or two so the agent is ready" />
      </Field>
      {error && <p className="text-sm text-[#B42318]" role="alert">{error}</p>}
      <Submit busy={busy}>Request a callback</Submit>
    </form>
  );
}

/** Signed-in users file an email request into their ticket list. Visitors use the public contact route. */
export function EmailForm({ guest = false }: { guest?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: string; emailed: boolean } | null>(null);
  if (done) return <Sent number={done.number} emailed={done.emailed} extra="The team will reply by email." />;
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = guest
          ? await api<{ number: string; emailed: boolean }>("/api/support/contact", { method: "POST", body: { name, email, subject, category, message, website } })
          : await api<{ ticket: SupportTicketView; emailed: boolean }>("/api/support/tickets", { method: "POST", body: { channel: "EMAIL", subject, category, message } });
        setBusy(false);
        if (!res.ok) return setError(res.error);
        const d = res.data as { number?: string; ticket?: SupportTicketView; emailed: boolean };
        setDone({ number: d.number ?? d.ticket?.number ?? "", emailed: d.emailed });
      }}
    >
      {guest && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Your name"><input className="input-field" required autoComplete="name" maxLength={SUPPORT_LIMITS.name} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email address"><input className="input-field" type="email" required autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Subject"><input className="input-field" maxLength={SUPPORT_LIMITS.subject} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" /></Field>
        <Field label="Topic">
          <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Topic">
            {SUPPORT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Message">
        <textarea className="input-field min-h-28" required maxLength={SUPPORT_LIMITS.message} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What happened, and what did you expect?" />
      </Field>
      {guest && (
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
          <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
        </div>
      )}
      {error && <p className="text-sm text-[#B42318]" role="alert">{error}</p>}
      <Submit busy={busy}>Send message</Submit>
    </form>
  );
}
