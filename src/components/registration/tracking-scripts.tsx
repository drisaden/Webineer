"use client";

import Script from "next/script";
import { useSyncExternalStore, useState } from "react";

const GA_ID_RE = /^G-[A-Z0-9]{4,20}$/;
const META_PIXEL_RE = /^\d{8,20}$/;
const KEY = "webineer:tracking-consent";
const listeners = new Set<() => void>();

type Choice = "granted" | "denied" | null;
const read = (): Choice => {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
};
const subscribe = (notify: () => void) => {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
};
function write(choice: "granted" | "denied") {
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    /* storage blocked: the choice only lasts until the page closes */
  }
  listeners.forEach((l) => l());
}

/**
 * Injects GA4 / Meta Pixel for a webinar, but only after the visitor accepts. Until then (and if they
 * decline) nothing from either service loads. IDs are re-validated here so only well-formed identifiers
 * ever reach a script; no custom code is accepted.
 */
export function TrackingScripts({ googleAnalyticsId, metaPixelId }: { googleAnalyticsId: string | null; metaPixelId: string | null }) {
  const ga = googleAnalyticsId && GA_ID_RE.test(googleAnalyticsId) ? googleAnalyticsId : null;
  const pixel = metaPixelId && META_PIXEL_RE.test(metaPixelId) ? metaPixelId : null;
  const stored = useSyncExternalStore(subscribe, read, () => "denied" as Choice);
  const [session, setSession] = useState<Choice>(null); // used when storage is blocked
  const choice = stored ?? session;
  if (!ga && !pixel) return null;

  const decide = (value: "granted" | "denied") => {
    setSession(value);
    write(value);
  };

  return (
    <>
      {choice === "granted" && ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="webineer-ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {choice === "granted" && pixel && (
        <Script id="webineer-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
      {choice === null && (
        <div role="dialog" aria-label="Analytics choice" data-testid="consent-banner" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-border bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.25)] sm:bottom-5">
          <p className="text-sm text-secondaryText">
            This page&apos;s host would like to use {[ga && "Google Analytics", pixel && "Meta Pixel"].filter(Boolean).join(" and ")} to measure visits and advertising. Nothing is loaded unless you accept.{" "}
            <a href="/privacy" className="font-medium text-[#17294B] underline">Privacy policy</a>
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => decide("denied")} className="tap min-h-11 rounded-xl border border-border bg-white px-4 text-sm font-medium text-primaryText">Decline</button>
            <button type="button" onClick={() => decide("granted")} className="tap min-h-11 rounded-xl bg-[#041B5E] px-4 text-sm font-semibold text-white">Accept</button>
          </div>
        </div>
      )}
    </>
  );
}
