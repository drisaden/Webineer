"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, CheckCircle2, Copy, Download, ExternalLink, Share2 } from "lucide-react";
import type { PublicRegistrationView } from "@/lib/webinar-workflow/public-view";
import { useClientOrigin } from "@/lib/use-client-value";

export interface ThankYouAccess {
  registrationId: string;
  accessKey: string;
}

function googleCalendarUrl(view: PublicRegistrationView, details: string) {
  const fmt = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: view.title,
    dates: `${fmt(view.calendar.startsAt)}/${fmt(view.calendar.endsAt)}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function ThankYouPanel({
  view,
  access,
  embedded,
  notice,
}: {
  view: PublicRegistrationView;
  access: ThankYouAccess | null;
  embedded: boolean;
  notice?: string;
}) {
  const t = view.thankYou;
  const origin = useClientOrigin();
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(t.redirectDelaySeconds);

  // Automatic redirect only on Webineer-hosted pages; browsers block top-level
  // navigation from cross-origin embeds without a click.
  useEffect(() => {
    if (!t.redirectUrl || embedded) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const left = t.redirectDelaySeconds - Math.floor((Date.now() - started) / 1000);
      if (left <= 0) {
        clearInterval(timer);
        window.location.assign(t.redirectUrl);
      } else setSecondsLeft(left);
    }, 250);
    return () => clearInterval(timer);
  }, [embedded, t.redirectDelaySeconds, t.redirectUrl]);

  const query = access ? `?r=${encodeURIComponent(access.registrationId)}&k=${encodeURIComponent(access.accessKey)}` : "";
  const joinLink = access && origin ? `${origin}/room/${view.slug}${query}` : "";
  const shareUrl = origin ? `${origin}/w/${view.slug}` : "";
  const shareText = `I just registered for "${view.title}"`;

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAFBF5] text-[#0F7B52]">
        <CheckCircle2 className="h-7 w-7" aria-hidden />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-primaryText">{t.headline}</h2>
        <p className="mt-2 text-secondaryText">{t.message}</p>
        {notice && <p className="mt-3 rounded-xl border border-[#D6E6FB] bg-[#F2F7FE] p-3 text-sm text-[#2F5E9E]">{notice}</p>}
      </div>

      {t.showWebinarDetails && (
        <div className="rounded-2xl border border-border bg-[#F7F9FC] p-4 text-left text-sm">
          <p className="font-semibold text-primaryText">{view.title}</p>
          <p className="mt-1 text-secondaryText">{view.dateLabel}</p>
          {view.hostName && <p className="mt-1 text-secondaryText">Hosted by {view.hostName}</p>}
        </div>
      )}

      {(t.joinInstructions || joinLink) && (
        <div className="space-y-3 rounded-2xl border border-border p-4 text-left text-sm">
          {t.joinInstructions && <p className="text-secondaryText">{t.joinInstructions}</p>}
          {joinLink && (
            <a href={joinLink} target={embedded ? "_blank" : undefined} rel="noopener" className="inline-flex items-center gap-2 font-medium text-[#17294B] underline">
              Your personal join link <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>
      )}

      {t.addToCalendar && (
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href={googleCalendarUrl(view, joinLink ? `Join: ${joinLink}` : view.description)}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-primaryText hover:bg-[#EEF2F7]"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden /> Google Calendar
          </a>
          <a
            href={`/api/public/webinars/${view.publicId}/calendar${query}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-primaryText hover:bg-[#EEF2F7]"
          >
            <Download className="h-4 w-4" aria-hidden /> Apple / Outlook (.ics)
          </a>
        </div>
      )}

      {t.socialSharing && shareUrl && (
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-secondaryText">
            <Share2 className="h-3.5 w-3.5" aria-hidden /> Share with a friend
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {[
              { label: "X", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
              { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
              { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
              { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}` },
            ].map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener" className="rounded-full border border-border bg-white px-3 py-1.5 hover:bg-[#EEF2F7]">
                {s.label}
              </a>
            ))}
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  /* clipboard unavailable */
                }
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 hover:bg-[#EEF2F7]"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden /> {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      {t.redirectUrl && (
        <div className="text-sm">
          {embedded ? (
            <a href={t.redirectUrl} target="_top" className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-[#101B35]" style={{ background: view.accentColor }}>
              Continue <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          ) : (
            <p className="text-secondaryText" aria-live="polite">
              Redirecting in {secondsLeft}s…{" "}
              <a className="font-medium text-[#17294B] underline" href={t.redirectUrl}>
                Continue now
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
