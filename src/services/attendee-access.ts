import { zonedDateTimeToUtc } from "@/lib/webinar-workflow/time";
import { primarySessionWindow } from "@/lib/webinar-workflow/sync";
import { getStore } from "@/server/repositories";
import { verifyAccess } from "@/services/registration-service";
import { sessionStartFor } from "@/services/workflow-notifications";
import type { Registration, Webinar } from "@/types";

export type AccessDecision =
  | { allowed: true; registration: Registration | null; host: boolean; sessionStart: Date; sessionEnd: Date }
  | { allowed: false; reason: string; kind: "register" | "payment" | "not_open" | "ended" | "unavailable" | "not_eligible" | "expired"; at?: Date };

function registrantWindow(webinar: Webinar, registration: Registration | null, now: Date) {
  const config = webinar.workflow!;
  const durationMs = config.schedules.durationMinutes * 60_000;
  if (registration) {
    const start = sessionStartFor(webinar, registration);
    return { start, end: new Date(start.getTime() + durationMs) };
  }
  const w = primarySessionWindow(webinar, now);
  return { start: w.startsAt, end: w.endsAt };
}

/**
 * Room access, enforced on the server for every page load. Paid webinars
 * always require a verified payment regardless of the access setting.
 */
export async function decideRoomAccess(webinar: Webinar, input: { r?: string; k?: string; host: boolean; now?: Date }): Promise<AccessDecision> {
  const config = webinar.workflow!;
  const now = input.now ?? new Date();
  const paid = config.integrations.payment.enabled;

  if (input.host) {
    const w = registrantWindow(webinar, null, now);
    return { allowed: true, registration: null, host: true, sessionStart: w.start, sessionEnd: w.end };
  }

  const registration = await verifyAccess(webinar, input.r, input.k);
  if (config.live.access === "registered" || paid) {
    if (!registration) return { allowed: false, kind: "register", reason: "This room is for registered attendees. Use the personal link from your confirmation email, or register first." };
    if (paid && registration.paymentStatus !== "paid") return { allowed: false, kind: "payment", reason: "Your payment hasn't been verified yet, so the room isn't available." };
  }

  const { start, end } = registrantWindow(webinar, registration, now);
  if (config.configuration.mode !== "always_on") {
    const opensAt = new Date(start.getTime() - config.live.entryOpensMinutesBefore * 60_000);
    if (now < opensAt) return { allowed: false, kind: "not_open", reason: "The room isn't open yet.", at: opensAt };
    if (now >= end) return { allowed: false, kind: "ended", reason: "This session has ended." };
    const lateLimit = config.live.allowLateJoin ? start.getTime() + config.live.lateJoinCutoffMinutes * 60_000 : start.getTime();
    // Late-join limits apply only to people arriving after the start; those already in the room aren't affected.
    if (now.getTime() > lateLimit && now > start) {
      return { allowed: false, kind: "ended", reason: config.live.allowLateJoin ? "The late-join window for this session has closed." : "This session has already started and late entry is turned off." };
    }
  }

  return { allowed: true, registration, host: false, sessionStart: start, sessionEnd: end };
}

/** Record attendance (used for "attended only" replay access and analytics). */
export async function recordRoomEntry(webinar: Webinar, registration: Registration | null) {
  const store = getStore();
  await store.recordAttendance({ workspaceId: webinar.workspaceId, webinarId: webinar.id, registrationId: registration?.id, sessionStartsAt: registration?.selectedSessionSlot });
  if (registration && registration.status === "registered") {
    await store.updateRegistration(registration.id, { status: "attended" });
  }
}

export async function decideReplayAccess(webinar: Webinar, input: { r?: string; k?: string; host: boolean; now?: Date }): Promise<AccessDecision> {
  const config = webinar.workflow!;
  const replay = config.replay;
  const now = input.now ?? new Date();
  if (!replay.enabled) return { allowed: false, kind: "unavailable", reason: "A replay isn't available for this webinar." };

  if (input.host) {
    const w = registrantWindow(webinar, null, now);
    return { allowed: true, registration: null, host: true, sessionStart: w.start, sessionEnd: w.end };
  }

  const registration = await verifyAccess(webinar, input.r, input.k);
  if (replay.access !== "anyone_with_link") {
    if (!registration) return { allowed: false, kind: "register", reason: "The replay is available to registered attendees. Use the personal link from your email." };
    if (registration.paymentStatus === "pending") return { allowed: false, kind: "payment", reason: "Your payment hasn't been verified yet." };
    if (replay.access === "attended_only" && !["attended", "converted"].includes(registration.status)) {
      return { allowed: false, kind: "not_eligible", reason: "The replay is only available to people who attended the live session." };
    }
    if (replay.access === "paid_only" && registration.paymentStatus !== "paid") {
      return { allowed: false, kind: "not_eligible", reason: "The replay is only available to paid registrants." };
    }
  }

  const { start, end } = registrantWindow(webinar, registration, now);
  if (replay.availability === "after_session" && config.configuration.mode !== "always_on" && now < end) {
    return { allowed: false, kind: "not_open", reason: "The replay will be available after the session ends.", at: end };
  }

  let expiresAt: Date | null = null;
  if (replay.expiration === "date" && replay.expiresOn) expiresAt = zonedDateTimeToUtc(`${replay.expiresOn}T23:59`, config.schedules.timezone);
  if (replay.expiration === "days_after") expiresAt = new Date(end.getTime() + replay.expiresAfterDays * 86_400_000);
  if (expiresAt && now > expiresAt) return { allowed: false, kind: "expired", reason: "This replay has expired." };

  return { allowed: true, registration, host: false, sessionStart: start, sessionEnd: end };
}
