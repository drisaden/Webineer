"use client";

import Link from "next/link";
import { Mail, MessageCircle, Phone, X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { SupportTicketView } from "@/lib/support/types";
import { api, formatWhen } from "./api";
import { CallbackForm, EmailForm, StartChatForm } from "./contact-forms";
import { DocSearch } from "./doc-search";
import { useSupportStatus } from "./use-support-status";

type Panel = "chat" | "call" | "email" | null;

function Card({ icon, title, status, body, children, testid }: { icon: ReactNode; title: string; status?: ReactNode; body: string; children: ReactNode; testid: string }) {
  return (
    <div className="flex flex-col rounded-[1.5rem] border border-border bg-white p-5 shadow-soft" data-testid={testid}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#17294B]">{icon}</span>
        {status}
      </div>
      <h3 className="mt-4 text-base font-semibold text-primaryText">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-secondaryText">{body}</p>
      <div className="mt-4 flex flex-col gap-2">{children}</div>
    </div>
  );
}

const btn = "inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium";

export function SupportHub() {
  const { status, unavailable, refresh } = useSupportStatus(30_000);
  const [panel, setPanel] = useState<Panel>(null);
  const [tickets, setTickets] = useState<SupportTicketView[] | null>(null);

  const load = useCallback(async () => {
    const res = await api<{ tickets: SupportTicketView[] }>("/api/support/tickets");
    if (res.ok) setTickets(res.data.tickets);
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => !document.hidden && void load(), 30_000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(id);
    };
  }, [load]);

  if (unavailable) return <div className="rounded-[1.5rem] border border-dashed border-border bg-[#F7F9FC] p-5 text-sm text-secondaryText">The support desk isn&apos;t available in demo mode. Connect the database to enable chat, callbacks and email requests.</div>;

  const openChat = tickets?.find((t) => t.channel === "CHAT" && t.status !== "SOLVED");
  const online = status?.online ?? false;
  const dot = <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${online ? "bg-[#EAFBF5] text-[#0F7B52]" : "bg-[#EEF2F7] text-secondaryText"}`} data-testid="agent-status"><span className={`h-2 w-2 rounded-full ${online ? "bg-[#16A36A]" : "bg-[#B6C0CF]"}`} aria-hidden />{status ? (online ? "Agents online" : "Offline") : "…"}</span>;

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
        <h2 className="text-xl text-primaryText">How can we help?</h2>
        <p className="mt-1 mb-4 text-sm text-secondaryText">Search the help articles, or talk to a person.</p>
        <DocSearch />
        <p className="mt-3 text-sm"><Link href="/help" className="tap font-medium text-[#17294B]">Browse all help articles →</Link></p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card testid="card-chat" icon={<MessageCircle className="h-5 w-5" aria-hidden />} title="Chat with an agent" status={dot} body={online ? "An agent can reply within minutes." : "No agent is online right now. Leave a message and we'll reply here and by email."}>
          {openChat ? (
            <Link href={`/dashboard/help/tickets/${openChat.id}`} className={`${btn} bg-[#041B5E] text-white`}>Continue your chat</Link>
          ) : (
            <button type="button" className={`${btn} bg-[#041B5E] text-white`} onClick={() => setPanel(panel === "chat" ? null : "chat")}>Start a chat</button>
          )}
        </Card>
        <Card testid="card-call" icon={<Phone className="h-5 w-5" aria-hidden />} title="Call us" body={status?.phone ? `Available ${status.hours}. Outside those hours, request a callback.` : "Tell us when to call and an agent will ring you back."}>
          {status?.phone && <a href={`tel:${status.phone.replace(/[^\d+]/g, "")}`} className={`${btn} bg-[#041B5E] text-white`}>Call {status.phone}</a>}
          <button type="button" className={`${btn} border border-border bg-white text-primaryText`} onClick={() => setPanel(panel === "call" ? null : "call")}>Request a callback</button>
        </Card>
        <Card testid="card-email" icon={<Mail className="h-5 w-5" aria-hidden />} title="Send an email" body="Best for detailed questions. We reply to the address on your account.">
          <button type="button" className={`${btn} bg-[#041B5E] text-white`} onClick={() => setPanel(panel === "email" ? null : "email")}>Write to us</button>
          {status?.email && <a href={`mailto:${status.email}`} className="tap justify-center text-sm text-secondaryText underline">{status.email}</a>}
        </Card>
      </div>

      {panel && (
        <section className="rounded-[1.5rem] border border-border bg-white p-5 shadow-soft" aria-label={panel === "chat" ? "Start a chat" : panel === "call" ? "Request a callback" : "Send an email"} data-testid="support-panel">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-primaryText">{panel === "chat" ? "Start a chat" : panel === "call" ? "Request a callback" : "Send us an email"}</h3>
            <button type="button" onClick={() => setPanel(null)} className="tap-icon rounded-full text-secondaryText hover:bg-[#EEF5FF]" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          {panel === "chat" && <StartChatForm onStarted={(t) => { window.location.assign(`/dashboard/help/tickets/${t.id}`); }} />}
          {panel === "call" && <CallbackForm />}
          {panel === "email" && <EmailForm />}
        </section>
      )}

      <section className="rounded-[1.5rem] border border-border bg-white shadow-soft" aria-label="Your conversations">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-base font-semibold text-primaryText">Your conversations</h3>
          <button type="button" className="tap text-xs text-secondaryText underline" onClick={() => { void load(); refresh(); }}>Refresh</button>
        </div>
        {tickets === null ? (
          <p className="px-5 py-6 text-sm text-secondaryText">Loading…</p>
        ) : tickets.length === 0 ? (
          <p className="px-5 py-6 text-sm text-secondaryText">You haven&apos;t contacted support yet. Your chats, callbacks and emails will show up here.</p>
        ) : (
          <ul>
            {tickets.map((t) => (
              <li key={t.id} className="border-b border-border last:border-0">
                <Link href={`/dashboard/help/tickets/${t.id}`} className="flex min-h-14 items-center gap-3 px-5 py-3 hover:bg-[#F7F9FC]" data-testid="my-ticket">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.unread ? "bg-[#E5484D]" : "bg-transparent"}`} aria-label={t.unread ? "Unread reply" : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-primaryText">{t.subject}</span>
                    <span className="block truncate text-xs text-secondaryText">{t.number} · {t.channel === "CHAT" ? "Chat" : t.channel === "EMAIL" ? "Email" : "Callback"} · {formatWhen(t.lastMessageAt)}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${t.status === "SOLVED" ? "bg-[#EAFBF5] text-[#0F7B52]" : t.status === "PENDING" ? "bg-[#EEF2F7] text-secondaryText" : "bg-[#FFF3DE] text-[#8A5A0E]"}`}>{t.status === "SOLVED" ? "Solved" : t.status === "PENDING" ? "Waiting for you" : "Waiting for us"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
