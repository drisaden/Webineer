"use client";

import { useEffect, useState } from "react";
import type { SupportStatusInfo } from "@/lib/support/types";
import { api } from "./api";

/** Agent availability, contact details and unread count. Refreshes every minute and when the tab regains focus. */
export function useSupportStatus(everyMs = 60_000): { status: SupportStatusInfo | null; unavailable: boolean; refresh: () => void } {
  const [status, setStatus] = useState<SupportStatusInfo | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    const run = async () => {
      const res = await api<SupportStatusInfo>("/api/support/status");
      if (stopped) return;
      if (res.ok) {
        setStatus(res.data);
        setUnavailable(false);
      } else if (res.status === 503) {
        setUnavailable(true);
        return;
      }
      timer = window.setTimeout(run, document.hidden ? everyMs * 3 : everyMs);
    };
    const wake = () => {
      if (!document.hidden && !stopped) {
        window.clearTimeout(timer);
        void run();
      }
    };
    document.addEventListener("visibilitychange", wake);
    timer = window.setTimeout(run, 0);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [everyMs, tick]);

  return { status, unavailable, refresh: () => setTick((n) => n + 1) };
}
