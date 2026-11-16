"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { HostAction, LiveAction, LiveChatMessage, LiveSyncResponse } from "@/lib/live/types";

export interface Burst {
  key: number;
  emoji: string;
  /** Horizontal position, percent. */
  left: number;
  delay: number;
}

export interface LiveRoomState {
  ready: boolean;
  /** Set when the server refuses the room (closed, not allowed). Polling stops. */
  blocked: string | null;
  sync: LiveSyncResponse | null;
  messages: LiveChatMessage[];
  bursts: Burst[];
  needsName: boolean;
  displayName: string;
  setDisplayName: (name: string) => void;
  send: (action: LiveAction) => Promise<string | null>;
  host: (action: HostAction) => Promise<string | null>;
  react: (emoji: string) => void;
  endBurst: (key: number) => void;
}

const Ctx = createContext<LiveRoomState | null>(null);
export const LiveRoomProvider = Ctx.Provider;

export function useLiveRoomState(): LiveRoomState {
  const value = useContext(Ctx);
  if (!value) throw new Error("useLiveRoomState must be used inside <LiveRoom>.");
  return value;
}

const KEY_STORE = "webineer.live.viewer";
const NAME_STORE = "webineer.live.name";
const MESSAGE_CAP = 300;

function readStore(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function writeStore(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the name just won't be remembered */
  }
}
function newViewerKey(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface LiveRoomOptions {
  slug: string;
  registrationId?: string;
  accessKey?: string;
  asHost: boolean;
  /** Anyone-with-the-link rooms have no registration, so the viewer picks a display name. */
  anonymous: boolean;
}

export function useLiveRoom({ slug, registrationId, accessKey, asHost, anonymous }: LiveRoomOptions): LiveRoomState {
  const [sync, setSync] = useState<LiveSyncResponse | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [displayName, setNameState] = useState("");
  const cursor = useRef({ messages: 0, reactions: -1 });
  const viewerKey = useRef("");
  const pending = useRef<Record<string, number>>({});
  const burstId = useRef(0);
  const nameRef = useRef("");
  /** Runs a sync right now (set by the polling effect). Used after actions so the viewer sees the result at once. */
  const syncNow = useRef<() => void>(() => undefined);

  const identity = useCallback(
    () => ({
      r: registrationId ?? null,
      k: accessKey ?? null,
      asHost,
      anonKey: viewerKey.current || null,
      anonName: nameRef.current || null,
    }),
    [registrationId, accessKey, asHost],
  );

  const mergeMessages = useCallback((incoming: LiveChatMessage[], removed: string[] = []) => {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      for (const id of removed) map.delete(id);
      const next = Array.from(map.values()).sort((a, b) => a.seq - b.seq);
      return next.length > MESSAGE_CAP ? next.slice(next.length - MESSAGE_CAP) : next;
    });
  }, []);

  const spawn = useCallback((emojis: string[]) => {
    const picked = emojis.slice(0, 12);
    setBursts((prev) => [...prev.slice(-30), ...picked.map((emoji, i) => ({ key: ++burstId.current, emoji, left: 8 + Math.random() * 84, delay: i * 120 }))]);
  }, []);

  // Identity that lives in the browser: viewer key and display name for anyone-with-the-link rooms.
  useEffect(() => {
    let key = readStore(KEY_STORE);
    if (!/^[a-f0-9]{24}$/.test(key)) {
      key = newViewerKey();
      writeStore(KEY_STORE, key);
    }
    viewerKey.current = key;
    const name = readStore(NAME_STORE);
    nameRef.current = name;
    const t = window.setTimeout(() => setNameState(name), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    let controller: AbortController | undefined;
    let failures = 0;

    const run = async () => {
      if (stopped) return;
      controller = new AbortController();
      let next = 3000;
      try {
        const res = await fetch(`/api/room/${encodeURIComponent(slug)}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...identity(), cursor: cursor.current }),
          signal: controller.signal,
          cache: "no-store",
        });
        if (res.status === 403 || res.status === 404 || res.status === 503) {
          const data = await res.json().catch(() => ({}));
          if (!stopped) setBlocked(typeof data.error === "string" ? data.error : "The room isn't available.");
          return;
        }
        if (!res.ok) throw new Error(`sync ${res.status}`);
        const data = (await res.json()) as LiveSyncResponse;
        failures = 0;
        if (stopped) return;
        const firstLoad = cursor.current.reactions < 0;
        cursor.current = { messages: Math.max(cursor.current.messages, data.cursor.messages), reactions: data.cursor.reactions };
        mergeMessages(data.messages, data.removedIds);
        const fresh: string[] = [];
        for (const r of data.reactions) {
          if ((pending.current[r.emoji] ?? 0) > 0) pending.current[r.emoji] -= 1;
          else fresh.push(r.emoji);
        }
        if (fresh.length && !firstLoad) spawn(fresh);
        setSync(data);
        next = document.hidden ? Math.max(data.pollEveryMs, 15000) : data.pollEveryMs;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        failures += 1;
        next = Math.min(30000, 3000 * 2 ** failures);
      }
      if (!stopped) timer = window.setTimeout(run, next);
    };

    const wake = () => {
      if (document.hidden || stopped) return;
      window.clearTimeout(timer);
      void run();
    };
    document.addEventListener("visibilitychange", wake);
    syncNow.current = () => {
      if (stopped) return;
      window.clearTimeout(timer);
      controller?.abort();
      void run();
    };
    timer = window.setTimeout(run, 0);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", wake);
    };
  }, [slug, identity, mergeMessages, spawn]);

  const post = useCallback(
    async (path: "act" | "host", action: unknown): Promise<{ error: string | null; data: Record<string, unknown> }> => {
      try {
        const res = await fetch(`/api/room/${encodeURIComponent(slug)}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...identity(), action }), cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) return { error: typeof data.error === "string" ? data.error : "That didn't go through. Please try again.", data };
        return { error: null, data };
      } catch {
        return { error: "You seem to be offline. Please try again.", data: {} };
      }
    },
    [slug, identity],
  );

  const send = useCallback(
    async (action: LiveAction) => {
      const { error, data } = await post("act", action);
      if (error) return error;
      const message = data.message as LiveChatMessage | undefined;
      if (message && action.type === "chat") mergeMessages([message]);
      if (message && action.type === "chat") cursor.current = { ...cursor.current, messages: Math.max(cursor.current.messages, message.seq) };
      if (action.type !== "reaction") syncNow.current();
      return null;
    },
    [post, mergeMessages],
  );

  const host = useCallback(
    async (action: HostAction) => {
      const { error } = await post("host", action);
      if (error) return error;
      if (action.type === "hide") setMessages((prev) => prev.filter((m) => m.id !== action.messageId));
      syncNow.current();
      return null;
    },
    [post],
  );

  const lastTap = useRef(0);
  const react = useCallback(
    (emoji: string) => {
      const now = Date.now();
      if (now - lastTap.current < 250) return;
      lastTap.current = now;
      pending.current[emoji] = (pending.current[emoji] ?? 0) + 1;
      spawn([emoji]);
      void post("act", { type: "reaction", emoji });
    },
    [post, spawn],
  );

  const setDisplayName = useCallback((name: string) => {
    const clean = name.replace(/\s+/g, " ").trim().slice(0, 30);
    nameRef.current = clean;
    setNameState(clean);
    writeStore(NAME_STORE, clean);
  }, []);

  const endBurst = useCallback((key: number) => setBursts((prev) => prev.filter((b) => b.key !== key)), []);

  return useMemo(
    () => ({ ready: sync !== null, blocked, sync, messages, bursts, needsName: anonymous && !asHost && displayName.length < 2, displayName, setDisplayName, send, host, react, endBurst }),
    [sync, blocked, messages, bursts, anonymous, asHost, displayName, setDisplayName, send, host, react, endBurst],
  );
}
