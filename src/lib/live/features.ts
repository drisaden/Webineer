import { SAAS_PLANS, type LiveEntitlements } from "@/services/billing-entitlements";
import type { LiveSettings } from "@/types/webinar-workflow";

export type PlanKeyLike = keyof typeof SAAS_PLANS;

export const LIVE_FEATURE_KEYS = ["chat", "viewerCount", "reactions", "qa", "polls", "announcements", "moderationTools", "transcriptExport"] as const;
export type LiveFeatureKey = (typeof LIVE_FEATURE_KEYS)[number];

export const LIVE_FEATURE_LABELS: Record<LiveFeatureKey, string> = {
  chat: "Live chat",
  viewerCount: "Viewer count",
  reactions: "Reactions",
  qa: "Questions and answers",
  polls: "Live polls",
  announcements: "Pinned messages and announcements",
  moderationTools: "Slow mode, chat lock and muting",
  transcriptExport: "Chat and Q&A export",
};

/** Cheapest plan that includes a feature, used for upgrade hints. */
export function planThatUnlocks(feature: LiveFeatureKey): PlanKeyLike {
  const order: PlanKeyLike[] = ["free", "starter", "professional", "business"];
  return order.find((p) => SAAS_PLANS[p].entitlements.live[feature]) ?? "business";
}

export function livePlanFeatures(plan: PlanKeyLike): LiveEntitlements {
  return SAAS_PLANS[plan]?.entitlements.live ?? SAAS_PLANS.free.entitlements.live;
}

/** The features the host has switched on for this webinar (missing flags on older webinars count as off for chat and Q&A, on for the rest). */
export function hostLiveChoices(live: Partial<LiveSettings> | undefined): Record<"chat" | "qa" | "polls" | "reactions" | "viewerCount", boolean> {
  return {
    chat: live?.chatEnabled === true,
    qa: live?.qaEnabled === true,
    polls: live?.pollsEnabled !== false,
    reactions: live?.reactionsEnabled !== false,
    viewerCount: live?.viewerCountEnabled !== false,
  };
}

export interface ResolvedLiveFeatures extends LiveEntitlements {
  /** Features the host turned on but the plan doesn't include. */
  lockedByPlan: LiveFeatureKey[];
}

/**
 * What the room actually offers: a feature must be included in the plan AND switched on by the host.
 * Plan-only capabilities (announcements, moderation, export) follow the plan alone.
 */
export function resolveLiveFeatures(plan: PlanKeyLike, live: Partial<LiveSettings> | undefined): ResolvedLiveFeatures {
  const entitled = livePlanFeatures(plan);
  const chosen = hostLiveChoices(live);
  const lockedByPlan: LiveFeatureKey[] = [];
  const pick = (key: keyof typeof chosen): boolean => {
    if (!chosen[key]) return false;
    if (!entitled[key]) {
      lockedByPlan.push(key);
      return false;
    }
    return true;
  };
  const chat = pick("chat");
  return {
    chat,
    viewerCount: pick("viewerCount"),
    reactions: pick("reactions"),
    qa: pick("qa"),
    polls: pick("polls"),
    announcements: entitled.announcements,
    moderationTools: entitled.moderationTools,
    transcriptExport: entitled.transcriptExport,
    lockedByPlan,
  };
}

/** Short, human-readable list of live-room features a plan includes, for pricing and billing pages. */
export function livePlanHighlights(plan: PlanKeyLike): string[] {
  const f = livePlanFeatures(plan);
  const lines = ["Live chat and viewer count"];
  if (f.reactions || f.qa) lines.push("Emoji reactions and Q&A");
  if (f.polls) lines.push("Live polls");
  if (f.announcements) lines.push("Pinned messages and announcements");
  if (f.moderationTools) lines.push("Slow mode, chat lock and muting");
  if (f.transcriptExport) lines.push("Chat and Q&A export");
  return lines;
}
