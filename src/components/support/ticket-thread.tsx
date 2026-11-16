"use client";

import { CheckCircle2, Headphones, Lock, Mail, MessageCircle, Phone, SendHorizonal, StickyNote } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SUPPORT_LIMITS, type SupportMessageView, type SupportStatusId, type SupportThreadResponse, type SupportTicketView } from "@/lib/support/types";
import { api, formatWhen } from "./api";

const STATUS_LABEL: Record<SupportStatusId, string> = { OPEN: "Waiting for us", PENDING: "Waiting for you", SOLVED: "Solved" };
const AGENT_STATUS_LABEL: Record<SupportStatusId, string> = { OPEN: "Open", PENDING: "Waiting on customer", SOLVED: "Solved" };
const CHANNEL_ICON = { CHAT: MessageCircle, EMAIL: Mail, CALLBACK: Phone } as const;

export interface AgentOption {
  id: string;
  name: string;
}

interface Props {
  /** `/api/support/tickets/<id>` for customers, `/api/admin/support/tickets/<id>` for agents. */
  base: string;
  role: "customer" | "agent";
  /** Agents: who the ticket can be assigned to, and who is using the inbox. */
  agents?: AgentOption[];
  me?: { id: string; name: string };
  /** Called whenever the ticket changes so a surrounding list can refresh. */
  onTicket?: (ticket: SupportTicketView) => void;
  className?: string;
}

function Bubble({ m, role }: { m: SupportMessageView; role: "customer" | "agent" }) {
  if (m.from === "system") return <li className="px-4 py-1 text-center text-xs text-secondaryText">{m.body}</li>;
  const mine = role === "customer" ? m.from === "customer" : m.from === "agent" && !m.internal;
  const theirs = !mine;
  if (m.internal) {
    return (
      <li className="live-pop mx-3 my-1.5 rounded-xl border border-[#F5E1BC] bg-[#FFF8EA] px-3 py-2 text-sm" data-testid="support-note">
        <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-[#8A5A0E]"><StickyNote className="h-3.5 w-3.5" aria-hidden /> Internal note · {m.name} · {formatWhen(m.at)}</p>
        <p className="whitespace-pre-wrap break-words text-primaryText">{m.body}</p>
      </li>
    );
  }
  return (
    <li className={`live-pop flex px-3 py-1.5 ${mine ? "justify-end" : "justify-start"}`} data-testid="support-message" data-from={m.from}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "rounded-br-md bg-[#041B5E] text-white" : "rounded-bl-md border border-border bg-[#F7F9FC] text-primaryText"}`}>
        <p className={`mb-0.5 text-[11px] font-medium ${mine ? "text-white/70" : "text-secondaryText"}`}>
          {theirs ? m.name : "You"} · {formatWhen(m.at)}
        </p>
        <p className="whitespace-pre-wrap break-words">{m.body}</p>
      </div>
    </li>
  );
}

/** A support conversation: message list, live updates and a reply box. Used by customers and agents. */
export function TicketThread({ base, role, agents = [], me, onTicket, className = "" }: Props) {
  const [data, setData] = useState<SupportThreadResponse | null>(null);
  const [messages, setMessages] = useState<SupportMessageView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [busy, setBusy] = useState(false);
  const after = useRef(0);
  const syncNow = useRef<() => void>(() => undefined);
  const listRef = useRef<HTMLUListElement>(null);
  const stick = useRef(true);
  const onTicketRef = useRef(onTicket);
  useEffect(() => {
    onTicketRef.current = onTicket;
  });

  const merge = useCallback((incoming: SupportMessageView[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      return Array.from(map.values()).sort((a, b) => a.seq - b.seq);
    });
    after.current = Math.max(after.current, ...incoming.map((m) => m.seq));
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    let controller: AbortController | undefined;
    after.current = 0;
    const reset = window.setTimeout(() => {
      setMessages([]);
      setData(null);
      setNotFound(false);
    }, 0);

    const run = async () => {
      if (stopped) return;
      controller = new AbortController();
      const res = await api<SupportThreadResponse>(`${base}?after=${after.current}`, { signal: controller.signal });
      if (stopped) return;
      let next = document.hidden ? 20000 : role === "agent" ? 4000 : 3000;
      if (res.ok) {
        setData(res.data);
        merge(res.data.messages);
        onTicketRef.current?.(res.data.ticket);
      } else if (res.status === 404 || res.status === 401) {
        setNotFound(true);
        return;
      } else if (res.error) {
        next = 10000;
      }
      timer = window.setTimeout(run, next);
    };
    syncNow.current = () => {
      if (stopped) return;
      window.clearTimeout(timer);
      controller?.abort();
      void run();
    };
    const wake = () => !document.hidden && syncNow.current();
    document.addEventListener("visibilitychange", wake);
    timer = window.setTimeout(run, 0);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.clearTimeout(reset);
      controller?.abort();
      document.removeEventListener("visibilitychange", wake);
    };
  }, [base, role, merge]);

  const lastSeq = messages[messages.length - 1]?.seq;
  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lastSeq]);

  const ticket = data?.ticket;
  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    setText("");
    const res = await api<{ message: SupportMessageView }>(base, { method: "POST", body: role === "customer" ? { message: body } : { action: mode === "note" ? "note" : "reply", message: body } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setText((cur) => cur || body);
      return;
    }
    merge([res.data.message]);
    stick.current = true;
    syncNow.current();
  };

  const act = async (body: unknown) => {
    setError(null);
    const res = await api(base, { method: "POST", body });
    if (!res.ok) setError(res.error);
    syncNow.current();
  };

  const Icon = ticket ? CHANNEL_ICON[ticket.channel] : MessageCircle;
  const solved = ticket?.status === "SOLVED";
  const label = useMemo(() => (ticket ? (role === "agent" ? AGENT_STATUS_LABEL : STATUS_LABEL)[ticket.status] : ""), [ticket, role]);

  if (notFound) return <p className={`p-6 text-sm text-secondaryText ${className}`}>This conversation isn&apos;t available.</p>;
  if (!ticket) return <div className={`animate-pulse p-6 text-sm text-secondaryText ${className}`} aria-busy>Loading conversation…</div>;

  return (
    <div className={`flex min-h-0 flex-col ${className}`} data-testid="ticket-thread">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-secondaryText"><Icon className="h-3.5 w-3.5" aria-hidden /> {ticket.number} · {ticket.channel === "CHAT" ? "Chat" : ticket.channel === "EMAIL" ? "Email" : "Callback"}</p>
            <h2 className="truncate text-base font-semibold text-primaryText">{ticket.subject}</h2>
            {role === "agent" && <p className="truncate text-xs text-secondaryText">{ticket.requesterName} · {ticket.requesterEmail}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ticket.status === "SOLVED" ? "bg-[#EAFBF5] text-[#0F7B52]" : ticket.status === "PENDING" ? "bg-[#EEF2F7] text-secondaryText" : "bg-[#FFF3DE] text-[#8A5A0E]"}`} data-testid="ticket-status">{label}</span>
        </div>
        {ticket.channel === "CALLBACK" && ticket.phone && (
          <p className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-[#EEF5FF] px-3 py-2 text-sm text-primaryText" data-testid="callback-details">
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            {role === "agent" ? (
              <a href={`tel:${ticket.phone.replace(/[^\d+]/g, "")}`} className="tap font-semibold underline">{ticket.phone}</a>
            ) : (
              <span>We&apos;ll call <strong>{ticket.phone}</strong></span>
            )}
            {ticket.callbackWindow && <span className="text-secondaryText">· {ticket.callbackWindow}</span>}
          </p>
        )}
        {role === "customer" && ticket.channel === "CHAT" && !solved && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-secondaryText">
            <span className={`h-2 w-2 rounded-full ${data?.agentOnline ? "bg-[#16A36A]" : "bg-[#B6C0CF]"}`} aria-hidden />
            {data?.agentOnline ? "An agent is online" : "No agent is online right now. We'll reply here and by email."}
          </p>
        )}
        {role === "agent" && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-secondaryText">Status</span>
              <select className="rounded-lg border border-border bg-white px-2 py-1.5" value={ticket.status} onChange={(e) => void act({ action: "status", status: e.target.value })} aria-label="Status">
                <option value="OPEN">Open</option>
                <option value="PENDING">Waiting on customer</option>
                <option value="SOLVED">Solved</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-secondaryText">Assigned</span>
              <select className="rounded-lg border border-border bg-white px-2 py-1.5" value={ticket.assigneeId ?? ""} onChange={(e) => void act({ action: "assign", assigneeId: e.target.value || null })} aria-label="Assignee">
                <option value="">Unassigned</option>
                {me && !agents.some((a) => a.id === me.id) && <option value={me.id}>{me.name} (me)</option>}
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.id === me?.id ? " (me)" : ""}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      <ul
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="min-h-0 flex-1 overflow-y-auto py-2"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
      >
        {messages.map((m) => <Bubble key={m.id} m={m} role={role} />)}
      </ul>

      <div className="shrink-0 border-t border-border p-3">
        {role === "agent" && (
          <div className="mb-2 flex gap-1 text-xs" role="tablist" aria-label="Reply type">
            {(["reply", "note"] as const).map((m) => (
              <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => setMode(m)} className={`min-h-9 rounded-lg px-3 font-medium ${mode === m ? "bg-[#041B5E] text-white" : "bg-[#EEF2F7] text-secondaryText"}`}>
                {m === "reply" ? "Reply to customer" : "Internal note"}
              </button>
            ))}
          </div>
        )}
        {solved && role === "customer" && <p className="mb-2 flex items-center gap-1.5 text-xs text-secondaryText"><CheckCircle2 className="h-3.5 w-3.5 text-[#16A36A]" aria-hidden /> This conversation is solved. Send a message to reopen it.</p>}
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2">
          <textarea
            className="input-field min-h-11 flex-1 resize-none py-2.5"
            rows={2}
            maxLength={SUPPORT_LIMITS.message}
            placeholder={role === "agent" ? (mode === "note" ? "Only agents can see this note" : "Write a reply") : "Type your message"}
            aria-label={role === "agent" ? (mode === "note" ? "Internal note" : "Reply") : "Message"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && (role === "customer" || e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button type="submit" disabled={busy || !text.trim()} className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-[#041B5E] px-4 text-sm font-medium text-white disabled:opacity-50" aria-label={mode === "note" ? "Add note" : "Send message"}>
            <SendHorizonal className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{mode === "note" ? "Add note" : "Send"}</span>
          </button>
        </form>
        <div className="mt-1.5 flex min-h-5 items-center justify-between gap-2 text-xs">
          <span role="alert" className="text-[#B42318]">{error}</span>
          {role === "customer" && !solved && (
            <button type="button" className="tap text-secondaryText underline" onClick={() => void act({ solve: true })}>Mark as solved</button>
          )}
          {role === "agent" && mode === "note" && <span className="flex items-center gap-1 text-[#8A5A0E]"><Lock className="h-3 w-3" aria-hidden /> Not visible to the customer</span>}
          {role === "agent" && mode === "reply" && <span className="text-secondaryText"><Headphones className="mr-1 inline h-3 w-3" aria-hidden />Ctrl/Cmd + Enter to send</span>}
        </div>
      </div>
    </div>
  );
}
