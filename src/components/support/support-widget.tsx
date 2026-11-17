"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headset, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SupportTicketView } from "@/lib/support/types";
import { api } from "./api";
import { StartChatForm } from "./contact-forms";
import { TicketThread } from "./ticket-thread";
import { useSupportStatus } from "./use-support-status";

const POSITION_KEY = "webineer.support-button-position";
const BUTTON_SIZE = 56;

type WidgetPosition = { x: number; y: number };

/** Floating help button on every dashboard page. Opens the live chat without leaving what you're doing. */
export function SupportWidget() {
  const pathname = usePathname();
  const { status, unavailable } = useSupportStatus(60_000);
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<SupportTicketView | null | undefined>(undefined);
  const [position, setPosition] = useState<WidgetPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number; startX: number; startY: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(POSITION_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as WidgetPosition;
      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
        setPosition({
          x: Math.min(Math.max(8, parsed.x), window.innerWidth - BUTTON_SIZE - 8),
          y: Math.min(Math.max(8, parsed.y), window.innerHeight - BUTTON_SIZE - 8),
        });
      }
    } catch {
      window.localStorage.removeItem(POSITION_KEY);
    }

    const clampPosition = () => {
      setPosition((current) => current ? {
        x: Math.min(Math.max(8, current.x), window.innerWidth - BUTTON_SIZE - 8),
        y: Math.min(Math.max(8, current.y), window.innerHeight - BUTTON_SIZE - 8),
      } : null);
    };

    window.addEventListener("resize", clampPosition);
    return () => window.removeEventListener("resize", clampPosition);
  }, []);

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
        <div role="dialog" aria-label="Support chat" data-testid="support-widget-panel" className="fixed inset-x-2 bottom-2 top-16 z-50 flex flex-col overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] sm:inset-x-auto sm:bottom-24 sm:right-5 sm:top-auto sm:h-[34rem] sm:w-[24rem]">
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
        onClick={() => {
          if (movedRef.current) {
            movedRef.current = false;
            return;
          }
          setOpen((v) => !v);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          const rect = event.currentTarget.getBoundingClientRect();
          dragRef.current = {
            pointerId: event.pointerId,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            startX: event.clientX,
            startY: event.clientY,
          };
          movedRef.current = false;
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
          const startX = event.clientX - dragRef.current.offsetX;
          const startY = event.clientY - dragRef.current.offsetY;
          const rect = event.currentTarget.getBoundingClientRect();
          const distance = Math.abs(event.clientX - dragRef.current.startX) + Math.abs(event.clientY - dragRef.current.startY);
          if (distance > 4) movedRef.current = true;
          setPosition({
            x: Math.min(Math.max(8, startX), window.innerWidth - BUTTON_SIZE - 8),
            y: Math.min(Math.max(8, startY), window.innerHeight - BUTTON_SIZE - 8),
          });
        }}
        onPointerUp={(event) => {
          if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const next = {
            x: Math.min(Math.max(8, rect.left), window.innerWidth - BUTTON_SIZE - 8),
            y: Math.min(Math.max(8, rect.top), window.innerHeight - BUTTON_SIZE - 8),
          };
          setPosition(next);
          window.localStorage.setItem(POSITION_KEY, JSON.stringify(next));
          dragRef.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setDragging(false);
        }}
        className={`fixed z-50 inline-flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-[#041B5E] text-white shadow-[0_12px_30px_rgba(4,27,94,0.4)] transition-transform ${position ? "" : "bottom-4 right-4 sm:bottom-5 sm:right-5"} ${dragging ? "cursor-grabbing scale-105" : "cursor-grab hover:scale-105 active:scale-95"}`}
        style={position ? { left: position.x, top: position.y } : undefined}
        aria-label={unread ? `Open support chat, ${unread} unread` : "Open support chat"}
        aria-expanded={open}
        data-testid="support-widget-button"
      >
        {open ? <X className="h-6 w-6" aria-hidden /> : <Headset className="h-6 w-6" aria-hidden />}
        {unread > 0 && !open && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E5484D] px-1 text-[11px] font-semibold text-white" data-testid="support-widget-unread">{unread}</span>}
      </button>
    </>
  );
}
