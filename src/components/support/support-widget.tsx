"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headset, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportTicketView } from "@/lib/support/types";
import { api } from "./api";
import { StartChatForm } from "./contact-forms";
import { TicketThread } from "./ticket-thread";
import { useSupportStatus } from "./use-support-status";

const BUTTON = 56;
const MARGIN = 8;
const PANEL_W = 384;
const PANEL_H = 544;
const STORAGE_KEY = "webineer:support-button";
type Point = { x: number; y: number };

const clamp = (p: Point): Point => ({
  x: Math.min(Math.max(p.x, MARGIN), Math.max(MARGIN, window.innerWidth - BUTTON - MARGIN)),
  y: Math.min(Math.max(p.y, MARGIN), Math.max(MARGIN, window.innerHeight - BUTTON - MARGIN)),
});

function readSaved(): Point | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Point;
    return typeof p.x === "number" && typeof p.y === "number" ? clamp(p) : null;
  } catch {
    return null;
  }
}

/**
 * Floating help button on every dashboard page. Opens the live chat without leaving what you're doing.
 * Drag the button anywhere (it remembers where you left it); a tap or the keyboard opens the chat.
 */
export function SupportWidget() {
  const pathname = usePathname();
  const { status, unavailable } = useSupportStatus(60_000);
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<SupportTicketView | null | undefined>(undefined);
  // null = the default corner. Set once the person drags the button.
  const [pos, setPos] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [wide, setWide] = useState(false);
  const drag = useRef<{ id: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);

  useEffect(() => {
    // Read after mount: the saved spot lives in localStorage, which the server render can't see.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPos(readSaved());
    const query = window.matchMedia("(min-width: 640px)");
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => {
      query.removeEventListener("change", sync);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const save = useCallback((p: Point) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* private mode: the position just won't be remembered */
    }
  }, []);

  const current = (): Point => pos ?? { x: window.innerWidth - BUTTON - (window.innerWidth >= 640 ? 20 : 16), y: window.innerHeight - BUTTON - (window.innerWidth >= 640 ? 20 : 16) };

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    const at = current();
    drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, originX: at.x, originY: at.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    setDragging(true);
    setPos(clamp({ x: d.originX + dx, y: d.originY + dy }));
  }
  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (d.moved) {
      const final = clamp({ x: d.originX + (e.clientX - d.startX), y: d.originY + (e.clientY - d.startY) });
      setPos(final);
      save(final);
    } else {
      setOpen((v) => !v);
    }
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    // Keyboard users: arrow keys nudge the button; Enter/Space open the chat (the browser's click).
    const step = e.shiftKey ? 48 : 16;
    const delta: Record<string, Point> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    const d = delta[e.key];
    if (!d || !e.altKey) return;
    e.preventDefault();
    const at = current();
    const next = clamp({ x: at.x + d.x, y: at.y + d.y });
    setPos(next);
    save(next);
  }
  function resetPosition() {
    setPos(null);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  // Where the chat panel opens on wider screens: beside the button, on the side with more room.
  const panelStyle: React.CSSProperties | undefined = (() => {
    if (!wide || !pos || typeof window === "undefined") return undefined;
    const left = Math.min(Math.max(pos.x + BUTTON - PANEL_W, MARGIN), window.innerWidth - PANEL_W - MARGIN);
    const below = pos.y < window.innerHeight / 2;
    const room = below ? window.innerHeight - (pos.y + BUTTON + MARGIN * 2) : pos.y - MARGIN * 2;
    const height = Math.min(PANEL_H, Math.max(280, room));
    return below ? { left, top: pos.y + BUTTON + MARGIN, height, width: PANEL_W } : { left, top: Math.max(MARGIN, pos.y - MARGIN - height), height, width: PANEL_W };
  })();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void api<{ tickets: SupportTicketView[] }>("/api/support/tickets").then((res) => {
      if (!cancelled) setChat(res.ok ? (res.data.tickets.find((t) => t.channel === "CHAT" && t.status !== "SOLVED") ?? null) : null);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // The help page has the same options on the page itself, and the full conversation page is already a chat.
  if (unavailable || pathname.startsWith("/dashboard/help")) return null;
  const unread = status?.unread ?? 0;

  return (
    <>
      {open && (
        <div role="dialog" aria-label="Support chat" data-testid="support-widget-panel" style={panelStyle} className={`fixed inset-x-2 bottom-2 top-16 z-50 flex flex-col overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] ${panelStyle ? "sm:inset-x-auto sm:bottom-auto sm:top-auto" : "sm:inset-x-auto sm:bottom-24 sm:right-5 sm:top-auto sm:h-[34rem] sm:w-[24rem]"}`}>
          <div className="flex shrink-0 items-center justify-between bg-[#101B35] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Support</p>
              <p className="flex items-center gap-1.5 text-xs text-white/75"><span className={`h-2 w-2 rounded-full ${status?.online ? "bg-[#0AEBCB]" : "bg-white/40"}`} aria-hidden />{status?.online ? "Agents online" : "We reply by email when offline"}</p>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/dashboard/help" className="tap rounded-lg px-2 text-xs text-white/80 hover:text-white">All options</Link>
              <button type="button" onClick={() => setOpen(false)} className="tap-icon rounded-full hover:bg-white/10" aria-label="Close support chat"><X className="h-4 w-4" /></button>
            </div>
          </div>
          {chat === undefined ? (
            <p className="p-5 text-sm text-secondaryText">Loading…</p>
          ) : chat ? (
            <TicketThread base={`/api/support/tickets/${chat.id}`} role="customer" className="flex-1" />
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-3 text-sm text-secondaryText">{status?.online ? "An agent is online. Tell us what you need." : "No agent is online right now. Leave a message and we'll reply here and by email."}</p>
              <StartChatForm onStarted={(t) => setChat(t)} />
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null; setDragging(false); }}
        onKeyDown={onKeyDown}
        onClick={(e) => { if (e.detail === 0) setOpen((v) => !v); }}
        onDoubleClick={resetPosition}
        style={pos ? { left: pos.x, top: pos.y, touchAction: "none" } : { touchAction: "none" }}
        className={`fixed z-50 inline-flex h-14 w-14 select-none items-center justify-center rounded-full bg-[#041B5E] text-white shadow-[0_12px_30px_rgba(4,27,94,0.4)] ${pos ? "" : "bottom-4 right-4 sm:bottom-5 sm:right-5"} ${dragging ? "scale-110 cursor-grabbing" : "cursor-grab transition-transform hover:scale-105 active:scale-95"}`}
        aria-label={unread ? `Open support chat, ${unread} unread` : "Open support chat"}
        aria-expanded={open}
        aria-description="Drag to move this button. Alt plus arrow keys also move it. Double-click to put it back."
        title="Support. Drag to move."
        data-testid="support-widget-button"
      >
        {open ? <X className="h-6 w-6" aria-hidden /> : <Headset className="h-6 w-6" aria-hidden />}
        {unread > 0 && !open && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E5484D] px-1 text-[11px] font-semibold text-white" data-testid="support-widget-unread">{unread}</span>}
      </button>
    </>
  );
}
