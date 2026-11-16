"use client";

import { ArrowLeft, Headphones, Mail, MessageCircle, Phone, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportTicketView } from "@/lib/support/types";
import { api, formatWhen } from "./api";
import { TicketThread, type AgentOption } from "./ticket-thread";

type Filter = "open" | "mine" | "unassigned" | "pending" | "solved";
const TABS: { id: Filter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "mine", label: "Mine" },
  { id: "unassigned", label: "Unassigned" },
  { id: "pending", label: "Waiting" },
  { id: "solved", label: "Solved" },
];
const ICON = { CHAT: MessageCircle, EMAIL: Mail, CALLBACK: Phone } as const;

interface InboxData {
  tickets: SupportTicketView[];
  counts: Record<Filter, number>;
  agents: AgentOption[];
  me: { id: string; name: string; available: boolean };
  agentsOnline: number;
}

/** Support inbox for staff: filter tabs, search, ticket list, live conversation and the availability switch. */
export function AgentInbox({ initialTicket }: { initialTicket?: string }) {
  const [filter, setFilter] = useState<Filter>("open");
  const [q, setQ] = useState("");
  const [data, setData] = useState<InboxData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(initialTicket ?? null);
  const [available, setAvailable] = useState(false);
  const params = useRef({ filter, q });
  useEffect(() => {
    params.current = { filter, q };
  });

  const load = useCallback(async () => {
    const { filter: f, q: query } = params.current;
    const res = await api<InboxData>(`/api/admin/support/tickets?filter=${f}&q=${encodeURIComponent(query)}`);
    if (res.ok) {
      setData(res.data);
      setAvailable(res.data.me.available);
      setError(null);
    } else setError(res.error);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [filter, q, load]);
  useEffect(() => {
    const id = window.setInterval(() => !document.hidden && void load(), 5000);
    return () => window.clearInterval(id);
  }, [load]);

  // Heartbeat keeps the agent "online" for customers while this page is open.
  const availableRef = useRef(false);
  useEffect(() => {
    availableRef.current = available;
  });
  useEffect(() => {
    const beat = () => void api("/api/admin/support/presence", { method: "POST", body: {} });
    beat();
    const id = window.setInterval(() => !document.hidden && beat(), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const toggle = async () => {
    const next = !available;
    setAvailable(next);
    const res = await api("/api/admin/support/presence", { method: "POST", body: { available: next } });
    if (!res.ok) {
      setAvailable(!next);
      setError(res.error);
    } else void load();
  };

  const tickets = data?.tickets ?? [];
  return (
    <div className="space-y-4" data-testid="agent-inbox">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#17294B]"><Headphones className="h-5 w-5" aria-hidden /></span>
          <div>
            <h2 className="text-lg font-semibold text-primaryText">Support inbox</h2>
            <p className="text-sm text-secondaryText" data-testid="agents-online">{data ? `${data.agentsOnline} agent${data.agentsOnline === 1 ? "" : "s"} online` : "Loading…"}</p>
          </div>
        </div>
        <button type="button" role="switch" aria-checked={available} onClick={toggle} className={`inline-flex min-h-11 items-center gap-3 rounded-2xl border px-4 text-sm font-medium ${available ? "border-[#BFE9E0] bg-[#E9FBF7] text-[#0F7B52]" : "border-border bg-white text-primaryText"}`} data-testid="availability-toggle">
          <span className={`h-2.5 w-2.5 rounded-full ${available ? "bg-[#16A36A]" : "bg-[#B6C0CF]"}`} aria-hidden />
          {available ? "Available for chats and calls" : "Away"}
        </button>
      </div>
      {error && <p className="rounded-xl border border-[#F5C2C0] bg-[#FDECEC] px-4 py-3 text-sm text-[#B42318]" role="alert">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <section className={`${selected ? "hidden lg:block" : ""} overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-soft`} aria-label="Tickets">
          <div className="flex gap-1 overflow-x-auto border-b border-border p-2" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={filter === t.id} onClick={() => setFilter(t.id)} className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium ${filter === t.id ? "bg-[#041B5E] text-white" : "text-secondaryText hover:bg-[#F7F9FC]"}`}>
                {t.label}
                {data && <span className={`rounded-full px-1.5 text-xs ${filter === t.id ? "bg-white/20" : "bg-[#EEF2F7]"}`}>{data.counts[t.id]}</span>}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 text-secondaryText" aria-hidden />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, subject or SUP-123" aria-label="Search tickets" className="min-h-11 w-full bg-transparent text-sm outline-none" />
          </label>
          <ul className="max-h-[60vh] overflow-y-auto" data-testid="ticket-list">
            {!data ? <li className="px-4 py-6 text-sm text-secondaryText">Loading…</li> : tickets.length === 0 ? <li className="px-4 py-6 text-sm text-secondaryText">Nothing here.</li> : tickets.map((t) => {
              const Icon = ICON[t.channel];
              return (
                <li key={t.id} className="border-b border-border last:border-0">
                  <button type="button" onClick={() => setSelected(t.id)} className={`flex min-h-16 w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#F7F9FC] ${selected === t.id ? "bg-[#EEF5FF]" : ""}`} data-testid="inbox-ticket" data-ticket={t.number}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-secondaryText" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-primaryText">{t.requesterName}</span>
                        <span className="shrink-0 text-xs text-secondaryText">{formatWhen(t.lastMessageAt)}</span>
                      </span>
                      <span className="block truncate text-xs text-secondaryText">{t.number} · {t.subject}</span>
                      <span className="block truncate text-xs text-secondaryText">{t.preview}</span>
                      {t.channel === "CALLBACK" && t.status !== "SOLVED" && <span className="mt-1 inline-block rounded-full bg-[#FFF3DE] px-2 text-xs text-[#8A5A0E]">Call back</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={`${selected ? "" : "hidden lg:flex"} flex h-[calc(100dvh-14rem)] min-h-[30rem] flex-col overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-soft`} aria-label="Conversation">
          {selected ? (
            <>
              <button type="button" onClick={() => setSelected(null)} className="tap flex items-center gap-1 border-b border-border px-4 text-sm text-[#17294B] lg:hidden"><ArrowLeft className="h-4 w-4" aria-hidden /> All tickets</button>
              <TicketThread key={selected} base={`/api/admin/support/tickets/${selected}`} role="agent" agents={data?.agents ?? []} me={data?.me} onTicket={() => void load()} className="flex-1" />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-secondaryText">Select a ticket to read and reply.</div>
          )}
        </section>
      </div>
    </div>
  );
}
