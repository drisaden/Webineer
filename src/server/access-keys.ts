import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuthMode } from "@/lib/supabase/config";
import type { Registration } from "@/types";

/**
 * Personal room/replay links carry `k = HMAC(REGISTRATION_LINK_SECRET, registrationId)`.
 * Nothing secret is stored in the database, and links can be re-issued (e.g.
 * in reminder emails) at any time. Rotating the secret invalidates all links.
 *
 * Demo mode without a secret falls back to a random key kept on the in-memory record.
 */
export function linkSecretConfigured(): boolean {
  return Boolean(process.env.REGISTRATION_LINK_SECRET && process.env.REGISTRATION_LINK_SECRET.length >= 32);
}

export function assertLinkSecret() {
  if (!linkSecretConfigured() && getAuthMode() !== "demo") {
    throw new Error("REGISTRATION_LINK_SECRET (32+ characters) must be configured to issue attendee links.");
  }
}

export function accessKeyFor(registration: Pick<Registration, "id" | "metadata">): string {
  if (linkSecretConfigured()) {
    return createHmac("sha256", process.env.REGISTRATION_LINK_SECRET!).update(`registration:${registration.id}`).digest("base64url").slice(0, 32);
  }
  const stored = registration.metadata?.accessKey;
  if (typeof stored === "string" && getAuthMode() === "demo") return stored;
  assertLinkSecret();
  return "";
}

export function accessKeyMatches(registration: Pick<Registration, "id" | "metadata">, candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  let expected: string;
  try {
    expected = accessKeyFor(registration);
  } catch {
    return false;
  }
  if (!expected || expected.length !== candidate.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(candidate));
}
