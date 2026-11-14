"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

/** Call-to-action that appears a configured number of minutes into the session. */
export function RoomCta({ label, url, showAt }: { label: string; url: string; showAt: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const delay = Math.max(0, new Date(showAt).getTime() - Date.now());
    const timer = setTimeout(() => setVisible(true), Math.min(delay, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [showAt]);
  if (!visible) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className="flex items-center justify-center gap-2 rounded-2xl bg-[#16D6B2] px-5 py-3.5 text-base font-semibold text-[#101B35] shadow-soft transition hover:bg-[#0FC7A6]"
    >
      {label} <ExternalLink className="h-4 w-4" aria-hidden />
    </a>
  );
}
