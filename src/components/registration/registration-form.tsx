"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import type { PublicRegistrationView } from "@/lib/webinar-workflow/public-view";
import type { RegistrationSource } from "@/types";
import { ThankYouPanel, type ThankYouAccess } from "./thank-you-panel";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "done"; access: ThankYouAccess | null; notice?: string }
  | { kind: "payment"; url: string; testMode: boolean };

function detectEmbedOrigin(): string {
  try {
    const ancestors = (window.location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins;
    if (ancestors && ancestors.length > 0) return ancestors[0];
    if (document.referrer) return new URL(document.referrer).origin;
  } catch {
    /* ignore */
  }
  return "";
}

/**
 * The one registration form used by the hosted page, inline embed and popup
 * embed. It always posts to the same server endpoint, which performs all
 * validation, so every method creates identical attendee records.
 */
export function RegistrationForm({
  view,
  source,
  embedded,
  preview,
}: {
  view: PublicRegistrationView;
  source: RegistrationSource;
  embedded: boolean;
  preview: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState({ name: "", email: "", phone: "", sessionId: view.sessions[0]?.id ?? "", website: "" });
  const [tierId, setTierId] = useState(view.tickets.length === 1 ? view.tickets[0].id : "");
  const [discountCode, setDiscountCode] = useState("");
  const [quote, setQuote] = useState<{ code: string; tierId: string; amount: number; discount: number; currency: string } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const applyCode = async () => {
    setQuoting(true);
    setFieldErrors((e) => ({ ...e, discountCode: "" }));
    try {
      const res = await fetch("/api/public/price-quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId: view.publicId, tierId, discountCode: discountCode.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setQuote(null); setFieldErrors((e) => ({ ...e, ...(data.fieldErrors ?? { discountCode: data.error ?? "Could not check the code." }) })); return; }
      setQuote({ code: data.code ?? "", tierId, amount: data.amount, discount: data.discount, currency: data.currency });
    } catch { setFieldErrors((e) => ({ ...e, discountCode: "Could not check the code. Try again." })); }
    finally { setQuoting(false); }
  };
  const quoteValid = quote && quote.code && quote.code === discountCode.trim().toUpperCase() && quote.tierId === tierId ? quote : null;
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const renderedAt = useRef<number>(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    renderedAt.current = Date.now();
    if (preview || tracked.current || view.closedReason) return;
    tracked.current = true;
    void fetch("/api/public/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId: view.publicId, source }),
      keepalive: true,
    }).catch(() => undefined);
  }, [preview, source, view.closedReason, view.publicId]);

  // Let the parent page resize the iframe / popup to fit the content.
  useEffect(() => {
    if (!embedded || !rootRef.current || typeof ResizeObserver === "undefined") return;
    const post = () => window.parent?.postMessage({ type: "webineer:resize", publicId: view.publicId, height: document.documentElement.scrollHeight }, "*");
    const observer = new ResizeObserver(post);
    observer.observe(rootRef.current);
    post();
    return () => observer.disconnect();
  }, [embedded, view.publicId]);

  if (status.kind === "done") {
    return (
      <div ref={rootRef}>
        <ThankYouPanel view={view} access={status.access} embedded={embedded} notice={status.notice} />
      </div>
    );
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (preview || status.kind === "submitting") return;
    setStatus({ kind: "submitting" });
    setFieldErrors({});
    try {
      const response = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: view.publicId,
          name: values.name,
          email: values.email,
          phone: values.phone,
          sessionId: values.sessionId,
          answers,
          source,
          embedOrigin: embedded ? detectEmbedOrigin() : "",
          website: values.website,
          renderedAt: renderedAt.current,
          tierId,
          discountCode: discountCode.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFieldErrors(data.fieldErrors ?? {});
        setStatus({ kind: "error", message: data.error ?? "Registration failed. Please try again." });
        return;
      }
      if (data.kind === "payment_required") {
        if (embedded) setStatus({ kind: "payment", url: data.paymentUrl, testMode: data.testMode });
        else window.location.assign(data.paymentUrl);
        return;
      }
      if (data.kind === "already_registered") {
        setStatus({ kind: "done", access: null, notice: "This email is already registered. We've re-sent the confirmation email with your personal join link." });
      } else {
        const access = { registrationId: data.registrationId as string, accessKey: data.accessKey as string };
        if (embedded) {
          window.parent?.postMessage({ type: "webineer:registered", publicId: view.publicId }, "*");
          setStatus({ kind: "done", access });
        } else {
          router.push(`/w/${view.slug}/confirmation?r=${encodeURIComponent(access.registrationId)}&k=${encodeURIComponent(access.accessKey)}`);
        }
      }
    } catch {
      setStatus({ kind: "error", message: "We couldn't reach the server. Check your connection and try again." });
    }
  };

  const disabled = preview || Boolean(view.closedReason) || status.kind === "submitting";
  const fieldClass = (key: string) => `input-field ${fieldErrors[key] ? "border-[#DC5353]" : ""}`;
  const fieldErrorEl = (name: string) =>
    fieldErrors[name] ? (
      <p id={`err-${name}`} role="alert" className="mt-1 text-xs text-[#B33A3A]">
        {fieldErrors[name]}
      </p>
    ) : null;

  return (
    <div ref={rootRef}>
      {status.kind === "payment" ? (
        <div className="space-y-4 text-center">
          <Lock className="mx-auto h-8 w-8 text-[#17294B]" aria-hidden />
          <p className="text-primaryText">Complete your payment to confirm your seat.</p>
          {status.testMode && <p className="text-xs text-[#8A5A0E]">Test mode: no real payment will be taken.</p>}
          <a href={status.url} target="_blank" rel="noopener" className="inline-flex rounded-xl px-5 py-3 font-semibold text-[#101B35]" style={{ background: view.accentColor }}>
            Continue to secure payment
          </a>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4" aria-describedby={status.kind === "error" ? "form-error" : undefined}>
          {preview && <p className="rounded-xl border border-[#F5E1BC] bg-[#FFF8EA] p-3 text-sm text-[#8A5A0E]">Preview — this webinar isn’t published yet, so the form can’t accept registrations.</p>}
          {view.closedReason && !preview && <p className="rounded-xl border border-[#F5D7D7] bg-[#FFF6F6] p-3 text-sm text-[#B33A3A]">{view.closedReason}</p>}

          {/* Honeypot for bots; hidden from people and assistive tech. */}
          <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => setValues((v) => ({ ...v, website: e.target.value }))} />
            </label>
          </div>

          <div>
            <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium text-primaryText">Full name</label>
            <input id="reg-name" className={fieldClass("name")} autoComplete="name" required maxLength={120} value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} aria-invalid={Boolean(fieldErrors.name) || undefined} aria-describedby={fieldErrors.name ? "err-name" : undefined} disabled={disabled} />
            {fieldErrorEl("name")}
          </div>
          <div>
            <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-primaryText">Email address</label>
            <input id="reg-email" type="email" className={fieldClass("email")} autoComplete="email" required maxLength={200} value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} aria-invalid={Boolean(fieldErrors.email) || undefined} aria-describedby={fieldErrors.email ? "err-email" : undefined} disabled={disabled} />
            {fieldErrorEl("email")}
          </div>
          {view.phoneField !== "hidden" && (
            <div>
              <label htmlFor="reg-phone" className="mb-1.5 block text-sm font-medium text-primaryText">
                Phone number {view.phoneField === "optional" && <span className="text-xs font-normal text-secondaryText">(optional)</span>}
              </label>
              <input id="reg-phone" type="tel" className={fieldClass("phone")} autoComplete="tel" maxLength={40} required={view.phoneField === "required"} value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} aria-invalid={Boolean(fieldErrors.phone) || undefined} disabled={disabled} />
              {fieldErrorEl("phone")}
            </div>
          )}
          {view.sessions.length > 1 && (
            <div>
              <label htmlFor="reg-session" className="mb-1.5 block text-sm font-medium text-primaryText">Choose a session</label>
              <select id="reg-session" className={fieldClass("sessionId")} value={values.sessionId} onChange={(e) => setValues((v) => ({ ...v, sessionId: e.target.value }))} disabled={disabled}>
                {view.sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              {fieldErrorEl("sessionId")}
            </div>
          )}
          {view.customQuestions.map((q) => {
            const key = `q_${q.id}`;
            const id = `reg-${key}`;
            if (q.type === "checkbox") {
              return (
                <div key={q.id}>
                  <label htmlFor={id} className="flex items-start gap-2 text-sm text-primaryText">
                    <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 accent-[#041B5E]" checked={answers[q.id] === true} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.checked }))} disabled={disabled} />
                    <span>{q.label}{q.required && <span className="text-[#B33A3A]"> *</span>}</span>
                  </label>
                  {fieldErrorEl(key)}
                </div>
              );
            }
            return (
              <div key={q.id}>
                <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-primaryText">
                  {q.label} {!q.required && <span className="text-xs font-normal text-secondaryText">(optional)</span>}
                </label>
                {q.type === "select" ? (
                  <select id={id} className={fieldClass(key)} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} disabled={disabled} required={q.required}>
                    <option value="">Select…</option>
                    {q.options.filter((o) => o.trim()).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : q.type === "textarea" ? (
                  <textarea id={id} rows={3} maxLength={2000} className={fieldClass(key)} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} disabled={disabled} required={q.required} />
                ) : (
                  <input id={id} maxLength={300} className={fieldClass(key)} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} disabled={disabled} required={q.required} />
                )}
                {fieldErrorEl(key)}
              </div>
            );
          })}

          {view.tickets.length > 0 && (
            <fieldset className="space-y-2" data-testid="ticket-options">
              <legend className="text-sm font-medium text-primaryText">Ticket</legend>
              {view.tickets.map((t) => (
                <label key={t.id} className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${tierId === t.id ? "border-[#041B5E] bg-[#F4F7FF]" : "border-[#E3E8F2]"}`}>
                  <input type="radio" name="ticket" value={t.id} checked={tierId === t.id} onChange={() => setTierId(t.id)} className="mt-1" />
                  <span className="flex-1">
                    <span className="block font-medium text-primaryText">{t.name}</span>
                    {t.description && <span className="block text-xs text-secondaryText">{t.description}</span>}
                  </span>
                  <span className="font-semibold text-primaryText">{t.price > 0 ? new Intl.NumberFormat("en", { style: "currency", currency: view.price?.currency ?? "NGN" }).format(t.price) : "Free"}</span>
                </label>
              ))}
              {fieldErrorEl("tierId")}
            </fieldset>
          )}

          {view.hasDiscountCodes && (
            <div>
              <label htmlFor="reg-code" className="mb-1 block text-sm font-medium text-primaryText">Discount code <span className="font-normal text-secondaryText">(optional)</span></label>
              <div className="flex gap-2">
                <input id="reg-code" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} maxLength={40} autoComplete="off" className="h-11 w-full rounded-xl border border-[#E3E8F2] px-3 text-sm uppercase" />
                <button type="button" data-apply-code onClick={applyCode} disabled={quoting || !discountCode.trim() || (view.tickets.length > 0 && !tierId)} className="h-11 shrink-0 rounded-xl border border-[#C9D3E6] px-4 text-sm font-medium text-primaryText disabled:opacity-50">{quoting ? "Checking…" : "Apply"}</button>
              </div>
              {quoteValid && <p data-testid="quote-total" className="mt-1 text-xs text-[#1D7A4B]">Code applied. You pay <strong>{quoteValid.amount > 0 ? new Intl.NumberFormat("en", { style: "currency", currency: quoteValid.currency }).format(quoteValid.amount) : "nothing"}</strong>{quoteValid.discount > 0 ? ` (saves ${new Intl.NumberFormat("en", { style: "currency", currency: quoteValid.currency }).format(quoteValid.discount)})` : ""}.</p>}
              {fieldErrorEl("discountCode")}
            </div>
          )}

          {status.kind === "error" && (
            <p id="form-error" role="alert" className="rounded-xl border border-[#F5D7D7] bg-[#FFF6F6] p-3 text-sm text-[#B33A3A]">
              {status.message}
            </p>
          )}

          {view.price && (
            <p className="text-sm text-secondaryText">
              {view.price.from ? "From" : "Price"}: <strong className="text-primaryText">{view.price.amount > 0 ? new Intl.NumberFormat("en", { style: "currency", currency: view.price.currency }).format(view.price.amount) : "Free"}</strong>
              {view.price.testMode && <span className="ml-2 text-xs text-[#8A5A0E]">(test mode)</span>}
            </p>
          )}

          <button
            type="submit"
            disabled={disabled}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold text-[#101B35] shadow-[0_12px_24px_rgba(4,27,94,0.12)] transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#041B5E]/40 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: view.accentColor }}
          >
            {status.kind === "submitting" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {status.kind === "submitting" ? "Registering…" : view.price && (view.tickets.length === 0 || (view.tickets.find((t) => t.id === tierId)?.price ?? 1) > 0) ? `${view.buttonText} · Pay` : view.buttonText}
          </button>
          <p className="text-center text-[11px] text-secondaryText">Your details are used only for this webinar and its emails.</p>
        </form>
      )}
    </div>
  );
}
