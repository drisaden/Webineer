"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => undefined;

/** window.location.origin on the client, "" during server render (no hydration mismatch). */
export function useClientOrigin(): string {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
}

/** True once rendering on the client. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
