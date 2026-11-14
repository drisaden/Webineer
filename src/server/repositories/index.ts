import { getAuthMode } from "@/lib/supabase/config";
import { isDatabaseConfigured } from "@/server/db/prisma";
import { mockStore } from "./mock-store";
import { prismaStore } from "./prisma-store";
import type { WebinarStore } from "./types";

export type { WebinarStore } from "./types";
export { ConcurrencyError } from "./types";

/**
 * Before DATABASE_URL is configured (e.g. a fresh deployment), public pages should 404
 * instead of crashing. Reads find nothing; writes fail loudly. Never mock data.
 */
const unconfiguredStore: WebinarStore = new Proxy({ kind: "prisma" } as unknown as WebinarStore, {
  get(target, prop) {
    if (prop === "kind") return "prisma";
    if (typeof prop !== "string") return undefined;
    if (prop === "getRegistrationFunnel") return async () => ({ pageViews: 0, submissions: 0, successfulRegistrations: 0, conversionRate: 0, bySource: {} });
    if (prop.startsWith("list")) return async () => [];
    if (prop.startsWith("count")) return async () => 0;
    if (prop.startsWith("get") || prop.startsWith("find")) return async () => undefined;
    if (prop === "isSlugTaken") return async () => false;
    return async () => {
      throw new Error("DATABASE_URL is not set. Configure the Supabase pooled connection string (see .env.example).");
    };
  },
});

/**
 * Data source selection:
 * - Explicit local demo mode (NEXT_PUBLIC_DEMO_MODE=true, no Supabase, not on Vercel) → in-memory mock data.
 * - Everything else → Supabase PostgreSQL via Prisma. There is no silent fallback to mock data.
 */
export function getStore(): WebinarStore {
  if (getAuthMode() === "demo") return mockStore;
  return isDatabaseConfigured() ? prismaStore : unconfiguredStore;
}
