import { getCurrentUser, canManageWebinar } from "@/lib/auth/demo-session";
import { resolveLiveFeatures, type ResolvedLiveFeatures } from "@/lib/live/features";
import { cleanText, publicName } from "@/lib/live/text";
import { LIMITS } from "@/lib/live/types";
import { getEffectivePlan, type PlanKey } from "@/server/payments/service";
import { getStore } from "@/server/repositories";
import { decideRoomAccess, type AccessDecision } from "@/services/attendee-access";
import type { Webinar } from "@/types";

export interface RoomActor {
  /** Stable id for this viewer. Never sent to other viewers. */
  viewerKey: string;
  name: string;
  isHost: boolean;
}

export interface RoomContext {
  webinar: Webinar;
  organizationId: string;
  plan: PlanKey;
  features: ResolvedLiveFeatures;
  actor: RoomActor;
}

export type ContextResult = { ok: true; ctx: RoomContext } | { ok: false; status: number; error: string };

export interface ContextInput {
  slug: string;
  r?: string | null;
  k?: string | null;
  /** The browser says it opened the room as the host. The server still checks the session. */
  asHost?: boolean;
  anonKey?: string | null;
  anonName?: string | null;
}

interface Entry<T> {
  value: T;
  expires: number;
}
const g = globalThis as typeof globalThis & { __webineerLiveCache?: Map<string, Entry<unknown>> };
const cache: Map<string, Entry<unknown>> = (g.__webineerLiveCache ??= new Map());

/** Short-lived cache so a room full of pollers doesn't repeat the same lookups every few seconds. */
async function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now) return hit.value;
  const value = await load();
  cache.set(key, { value, expires: now + ttlMs });
  if (cache.size > 2000) for (const [k, e] of cache) if (e.expires <= now) cache.delete(k);
  return value;
}

export function clearLiveCache() {
  cache.clear();
}

const ANON_KEY = /^[A-Za-z0-9]{16,40}$/;

export async function resolveRoomContext(input: ContextInput): Promise<ContextResult> {
  const store = getStore();
  if (store.kind === "mock") return { ok: false, status: 503, error: "Live interaction needs the database, which isn't connected in demo mode." };

  const webinar = await memo(`w:${input.slug}`, 10_000, () => store.getWebinarBySlug(input.slug));
  if (!webinar || !webinar.workflow) return { ok: false, status: 404, error: "Room not found." };

  let host = false;
  if (input.asHost) {
    const user = await getCurrentUser();
    host = Boolean(user && canManageWebinar(user, webinar));
    if (host && user) {
      const plan = (await memo(`p:${webinar.workspaceId}`, 30_000, () => getEffectivePlan(webinar.workspaceId))).plan;
      const features = resolveLiveFeatures(plan, webinar.workflow.live);
      return {
        ok: true,
        ctx: { webinar, organizationId: webinar.workspaceId, plan, features, actor: { viewerKey: `host:${user.id}`, name: cleanText(user.name, LIMITS.name) || "Host", isHost: true } },
      };
    }
  }
  if (webinar.status === "draft") return { ok: false, status: 404, error: "Room not found." };

  const decision: AccessDecision = await memo(`d:${input.slug}:${input.r ?? ""}:${input.k ?? ""}`, 10_000, () => decideRoomAccess(webinar, { r: input.r ?? undefined, k: input.k ?? undefined, host: false }));
  if (!decision.allowed) return { ok: false, status: 403, error: decision.reason };

  let actor: RoomActor;
  if (decision.registration) {
    actor = { viewerKey: `reg:${decision.registration.id}`, name: publicName(decision.registration.name), isHost: false };
  } else {
    if (!input.anonKey || !ANON_KEY.test(input.anonKey)) return { ok: false, status: 400, error: "Missing viewer id." };
    actor = { viewerKey: `anon:${input.anonKey}`, name: publicName(input.anonName), isHost: false };
  }

  const plan = (await memo(`p:${webinar.workspaceId}`, 30_000, () => getEffectivePlan(webinar.workspaceId))).plan;
  return { ok: true, ctx: { webinar, organizationId: webinar.workspaceId, plan, features: resolveLiveFeatures(plan, webinar.workflow.live), actor } };
}
