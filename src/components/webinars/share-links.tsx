"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CopyButton({ text, label, testid }: { text: string; label: string; testid: string }) {
  const [done, setDone] = useState<"copied" | "failed" | null>(null);
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={async () => {
        setDone((await copyText(text)) ? "copied" : "failed");
        window.setTimeout(() => setDone(null), 2000);
      }}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-medium text-[#17294B] hover:bg-[#EEF5FF] sm:min-h-9"
    >
      {done === "copied" ? <Check className="h-4 w-4 text-[#16A36A]" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {done === "copied" ? "Copied" : done === "failed" ? "Copy failed" : label}
    </button>
  );
}

/** Full page address and a short link for sharing. The short link is created the first time it is asked for. */
export function ShareLinks({ webinarId, pageUrl, initialShort }: { webinarId: string; pageUrl: string; initialShort: string | null }) {
  const [short, setShort] = useState<string | null>(initialShort);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/webinars/${webinarId}/short-link`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { link?: { url: string }; error?: string };
      if (!res.ok || !body.link) setError(body.error ?? "Couldn't create the short link.");
      else {
        setShort(body.link.url);
        await copyText(body.link.url);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondaryText">Public registration link</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <a href={pageUrl} target="_blank" rel="noreferrer" className="flex min-h-[44px] min-w-0 flex-1 items-center truncate text-sm font-medium text-[#0A7F6B] hover:underline" data-testid="page-url">{pageUrl}</a>
          <CopyButton text={pageUrl} label="Copy link" testid="copy-page-url" />
        </div>
      </div>
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-secondaryText"><Link2 className="h-3.5 w-3.5" aria-hidden /> Short link</p>
        {short ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-primaryText" data-testid="short-url">{short}</span>
            <CopyButton text={short} label="Copy short link" testid="copy-short-url" />
          </div>
        ) : (
          <button type="button" onClick={create} disabled={busy} data-testid="create-short-link" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-medium text-[#17294B] hover:bg-[#EEF5FF] disabled:opacity-60 sm:min-h-9">
            <Link2 className="h-4 w-4" aria-hidden /> {busy ? "Creating…" : "Create short link"}
          </button>
        )}
        {error && <p role="alert" className="mt-1.5 text-xs text-[#B33A3A]">{error}</p>}
      </div>
    </div>
  );
}
