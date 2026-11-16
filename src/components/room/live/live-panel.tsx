"use client";

import { BarChart3, HelpCircle, MessageSquare, Pin, SendHorizonal, ShieldCheck, VolumeX, EyeOff, CheckCircle2, Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LIMITS, type LiveChatMessage } from "@/lib/live/types";
import { initialsOf } from "@/lib/live/text";
import { HostTools } from "./host-tools";
import { LiveUnavailable } from "./live-room";
import { useLiveRoomState } from "./use-live-room";

type Tab = "chat" | "qa" | "poll" | "host";

const AVATAR_COLORS = ["#0A7F6B", "#2457AA", "#8A5A0E", "#7A3FB5", "#B42318", "#0B6E99", "#5B6B1F", "#9A3C6B"];
function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function Avatar({ name, host }: { name: string; host?: boolean }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${host ? "ring-2 ring-[#0AEBCB]" : ""}`} style={{ background: host ? "#041B5E" : colorFor(name) }} aria-hidden>
      {initialsOf(name)}
    </span>
  );
}

function NamePrompt() {
  const { setDisplayName } = useLiveRoomState();
  const [value, setValue] = useState("");
  return (
    <form
      className="flex gap-2 border-t border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim().length >= 2) setDisplayName(value);
      }}
    >
      <input className="input-field min-w-0 flex-1" placeholder="Pick a display name to chat" aria-label="Display name" maxLength={LIMITS.name} value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="submit" disabled={value.trim().length < 2} className="h-11 shrink-0 rounded-2xl bg-[#041B5E] px-4 text-sm font-medium text-white disabled:opacity-50 md:h-10">
        Join chat
      </button>
    </form>
  );
}

function Composer({ kind }: { kind: "chat" | "question" }) {
  const { sync, send, needsName } = useLiveRoomState();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const room = sync?.room;
  const isHost = sync?.role === "host";
  const locked = kind === "chat" && room?.chatLocked && !isHost;
  if (needsName) return <NamePrompt />;
  const max = kind === "chat" ? LIMITS.chat : LIMITS.question;

  const submit = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    // Clear at once so the next message can be typed while this one sends. Put it back if it fails.
    setText("");
    const result = await send({ type: kind, text: value });
    setBusy(false);
    if (result) {
      setError(result);
      setText((current) => current || value);
    }
  };

  return (
    <div className="border-t border-border p-3">
      {locked ? (
        <p className="flex items-center gap-2 rounded-xl bg-[#F7F9FC] px-3 py-3 text-sm text-secondaryText">
          <Lock className="h-4 w-4" aria-hidden /> The host has paused chat for now.
        </p>
      ) : (
        <>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input className="input-field min-w-0 flex-1" aria-label={kind === "chat" ? "Chat message" : "Your question"} placeholder={kind === "chat" ? "Say something…" : "Ask the host a question…"} maxLength={max} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
            <button type="submit" disabled={busy || !text.trim()} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#041B5E] text-white disabled:opacity-50 md:h-10 md:w-10" aria-label={kind === "chat" ? "Send message" : "Send question"}>
              <SendHorizonal className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-secondaryText">
            <span aria-live="polite" className={error ? "text-[#B42318]" : ""}>
              {error ?? (kind === "chat" && room?.slowModeSeconds ? `Slow mode: one message every ${room.slowModeSeconds}s` : "")}
            </span>
            {text.length > max - 60 && (
              <span>
                {text.length}/{max}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ChatMessage({ m }: { m: LiveChatMessage }) {
  const { sync, host } = useLiveRoomState();
  const isHostViewer = sync?.role === "host";
  const features = sync?.features;
  return (
    <li className={`live-pop group flex gap-2.5 px-3 py-1.5 ${m.pinned ? "bg-[#FFF8EA]" : ""}`} data-testid="chat-message">
      <Avatar name={m.name} host={m.isHost} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <span className={`font-semibold ${m.isHost ? "text-[#041B5E]" : "text-secondaryText"}`}>{m.name}</span>
          {m.isHost && <span className="ml-1.5 rounded bg-[#041B5E] px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-white">Host</span>}
          <span className="ml-2 text-[11px] text-secondaryText/80">{clock(m.at)}</span>
        </p>
        <p className="break-words text-sm text-primaryText">{m.body}</p>
      </div>
      {isHostViewer && (
        <div className="flex shrink-0 items-start gap-0.5 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          {features?.announcements && (
            <button type="button" className="tap-icon rounded-lg text-secondaryText hover:bg-[#EEF5FF]" aria-label={m.pinned ? "Unpin message" : "Pin message"} onClick={() => void host({ type: "pin", messageId: m.id, pinned: !m.pinned })}>
              <Pin className="h-4 w-4" />
            </button>
          )}
          <button type="button" className="tap-icon rounded-lg text-secondaryText hover:bg-[#EEF5FF]" aria-label="Remove message" onClick={() => void host({ type: "hide", messageId: m.id })}>
            <EyeOff className="h-4 w-4" />
          </button>
          {features?.moderationTools && !m.isHost && (
            <button type="button" className="tap-icon rounded-lg text-secondaryText hover:bg-[#EEF5FF]" aria-label={`Mute ${m.name}`} onClick={() => void host({ type: "mute", messageId: m.id })}>
              <VolumeX className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function ChatTab() {
  const { messages, sync } = useLiveRoomState();
  const listRef = useRef<HTMLUListElement>(null);
  const stick = useRef(true);
  const [unseen, setUnseen] = useState(0);
  const count = messages.length;
  const lastId = messages[count - 1]?.id;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stick.current) {
      el.scrollTop = el.scrollHeight;
      const t = window.setTimeout(() => setUnseen(0), 0);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setUnseen((n) => n + 1), 0);
    return () => window.clearTimeout(t);
  }, [lastId]);

  const pinned = sync?.pinned;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {pinned && (
        <div className="flex items-start gap-2 border-b border-[#F5E1BC] bg-[#FFF8EA] px-3 py-2 text-sm" data-testid="pinned-message">
          <Pin className="mt-0.5 h-4 w-4 shrink-0 text-[#8A5A0E]" aria-hidden />
          <p className="min-w-0 break-words text-primaryText">
            <span className="font-semibold">{pinned.name}: </span>
            {pinned.body}
          </p>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <ul
          ref={listRef}
          role="log"
          aria-live="polite"
          aria-label="Live chat"
          className="h-full overflow-y-auto py-2"
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
            if (stick.current) setUnseen(0);
          }}
        >
          {messages.length === 0 ? <li className="px-4 py-10 text-center text-sm text-secondaryText">No messages yet. Say hello to get the chat going.</li> : messages.map((m) => <ChatMessage key={m.id} m={m} />)}
        </ul>
        {unseen > 0 && (
          <button
            type="button"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#041B5E] px-3 py-1.5 text-xs font-medium text-white shadow-lg"
            onClick={() => {
              const el = listRef.current;
              if (el) el.scrollTop = el.scrollHeight;
              stick.current = true;
              setUnseen(0);
            }}
          >
            New messages ↓
          </button>
        )}
      </div>
      <Composer kind="chat" />
    </div>
  );
}

function QaTab() {
  const { sync, host } = useLiveRoomState();
  const isHost = sync?.role === "host";
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const questions = useMemo(() => [...(sync?.questions ?? [])].sort((a, b) => Number(a.status === "ANSWERED") - Number(b.status === "ANSWERED") || a.seq - b.seq), [sync?.questions]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" aria-label="Questions">
        {questions.length === 0 && <li className="px-1 py-8 text-center text-sm text-secondaryText">No questions yet. Ask the host anything.</li>}
        {questions.map((q) => (
          <li key={q.id} className="live-pop rounded-xl border border-border bg-[#F7F9FC] p-3" data-testid="question">
            <div className="flex items-center justify-between gap-2 text-xs text-secondaryText">
              <span className="font-medium">{q.mine ? "You" : q.name}</span>
              {q.status === "ANSWERED" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EAFBF5] px-2 py-0.5 font-medium text-[#0F7B52]">
                  <CheckCircle2 className="h-3 w-3" aria-hidden /> Answered
                </span>
              )}
            </div>
            <p className="mt-1 break-words text-sm text-primaryText">{q.body}</p>
            {q.answer && (
              <p className="mt-2 break-words rounded-lg border border-[#BFE9E0] bg-white px-2.5 py-2 text-sm text-primaryText">
                <span className="font-semibold text-[#0A7F6B]">Host: </span>
                {q.answer}
              </p>
            )}
            {isHost && q.status !== "ANSWERED" && (
              <div className="mt-2 flex gap-2">
                <input className="input-field min-w-0 flex-1" placeholder="Type an answer (optional)" aria-label="Answer" maxLength={LIMITS.answer} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
                <button type="button" className="h-11 shrink-0 rounded-2xl bg-[#041B5E] px-3 text-sm font-medium text-white md:h-10" onClick={() => void host({ type: "answer", messageId: q.id, answer: answers[q.id] })}>
                  Mark answered
                </button>
              </div>
            )}
            {isHost && (
              <button type="button" className="tap mt-1 text-xs text-secondaryText underline" onClick={() => void host({ type: "hide", messageId: q.id })}>
                Remove question
              </button>
            )}
          </li>
        ))}
      </ul>
      <Composer kind="question" />
    </div>
  );
}

function PollTab() {
  const { sync, send } = useLiveRoomState();
  const [error, setError] = useState<string | null>(null);
  const poll = sync?.poll;
  if (!poll) return <p className="px-4 py-10 text-center text-sm text-secondaryText">No poll right now. When the host starts one, it appears here.</p>;
  const showResults = poll.status === "CLOSED" || poll.myVote !== null || sync?.role === "host";
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4" data-testid="poll">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium">
        {poll.status === "OPEN" ? <span className="rounded-full bg-[#FDECEC] px-2 py-0.5 text-[#B42318]">Poll open</span> : <span className="rounded-full bg-[#EEF2F7] px-2 py-0.5 text-secondaryText">Poll closed</span>}
        <span className="text-secondaryText">{poll.total} {poll.total === 1 ? "vote" : "votes"}</span>
      </div>
      <p className="mb-3 break-words text-base font-semibold text-primaryText">{poll.question}</p>
      <ul className="space-y-2">
        {poll.options.map((o) => {
          const pct = poll.total ? Math.round((o.votes / poll.total) * 100) : 0;
          const mine = poll.myVote === o.id;
          const canVote = poll.status === "OPEN" && poll.myVote === null && sync?.role !== "host";
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={!canVote}
                onClick={async () => setError(await send({ type: "vote", pollId: poll.id, optionId: o.id }))}
                className={`relative min-h-11 w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm ${mine ? "border-[#0A7F6B]" : "border-border"} ${canVote ? "bg-[#F7F9FC] hover:bg-[#EEF2F7]" : "bg-[#F7F9FC]"}`}
              >
                {showResults && <span className="absolute inset-y-0 left-0 bg-[#0AEBCB]/25 transition-[width] duration-700" style={{ width: `${pct}%` }} aria-hidden />}
                <span className="relative flex items-center justify-between gap-3">
                  <span className="break-words text-primaryText">
                    {o.label}
                    {mine && <span className="ml-2 text-xs font-medium text-[#0A7F6B]">Your vote</span>}
                  </span>
                  {showResults && <span className="shrink-0 font-medium text-primaryText">{pct}%</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-sm text-[#B42318]" role="alert">{error}</p>}
    </div>
  );
}

/** Chat, Q&A, polls and (for hosts) controls, in one panel that fits beside or below the video. */
export function LivePanel({ slug }: { slug?: string }) {
  const { sync, blocked } = useLiveRoomState();
  const [tab, setTab] = useState<Tab>("chat");
  const f = sync?.features;
  const isHost = sync?.role === "host";

  if (blocked) return <LiveUnavailable message={blocked} />;
  if (!sync) return <div className="h-[28rem] animate-pulse rounded-[2rem] border border-border bg-white shadow-soft" aria-busy aria-label="Loading live chat" />;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; show: boolean; dot?: boolean }[] = [
    { id: "chat", label: "Chat", icon: <MessageSquare className="h-4 w-4" />, show: Boolean(f?.chat) },
    { id: "qa", label: "Q&A", icon: <HelpCircle className="h-4 w-4" />, show: Boolean(f?.qa) },
    { id: "poll", label: "Poll", icon: <BarChart3 className="h-4 w-4" />, show: Boolean(f?.polls), dot: sync.poll?.status === "OPEN" && sync.poll.myVote === null && !isHost },
    { id: "host", label: "Host", icon: <ShieldCheck className="h-4 w-4" />, show: isHost },
  ];
  const visible = tabs.filter((t) => t.show);
  if (!visible.length) return <LiveUnavailable message="The host hasn't turned on chat or Q&A for this session." />;
  const active = visible.find((t) => t.id === tab) ?? visible[0];

  return (
    <section className="flex h-[32rem] flex-col overflow-hidden rounded-[2rem] border border-border bg-white shadow-soft xl:h-[40rem]" aria-label="Live interaction" data-testid="live-panel">
      <div role="tablist" className="flex shrink-0 border-b border-border">
        {visible.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={active.id === t.id} onClick={() => setTab(t.id)} className={`relative flex min-h-11 flex-1 items-center justify-center gap-1.5 text-sm font-medium ${active.id === t.id ? "text-primaryText" : "text-secondaryText hover:text-primaryText"}`}>
            {t.icon}
            {t.label}
            {t.dot && <span className="h-2 w-2 rounded-full bg-[#E5484D]" aria-label="New poll" />}
            {active.id === t.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#0AEBCB]" />}
          </button>
        ))}
      </div>
      {active.id === "chat" && <ChatTab />}
      {active.id === "qa" && <QaTab />}
      {active.id === "poll" && <PollTab />}
      {active.id === "host" && <HostTools slug={slug} />}
    </section>
  );
}
