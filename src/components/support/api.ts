"use client";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

/** Small fetch wrapper: JSON in, JSON out, and a readable error instead of an exception. */
export async function api<T = Record<string, unknown>>(url: string, init?: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: init?.signal,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, status: res.status, error: typeof data.error === "string" ? data.error : "That didn't go through. Please try again." };
    return { ok: true, data: data as T };
  } catch (error) {
    if ((error as Error).name === "AbortError") return { ok: false, status: 0, error: "" };
    return { ok: false, status: 0, error: "You seem to be offline. Please try again." };
  }
}

export function formatWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
