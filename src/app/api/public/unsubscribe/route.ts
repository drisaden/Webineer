import { NextResponse } from "next/server";
import { unsubscribeTokenMatches } from "@/lib/compliance";
import { getStore } from "@/server/repositories";
import { limitOr429 } from "@/lib/server/http";

/**
 * One-click unsubscribe from an email's footer link. The signed token proves the link came from us,
 * so no sign-in is needed. Reminders and follow-ups stop for this address in this workspace.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const id = String(form?.get("r") ?? "");
  const token = String(form?.get("t") ?? "");
  const back = (state: string) => NextResponse.redirect(new URL(`/unsubscribe?r=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}&state=${state}`, request.url), 303);
  if (await limitOr429(request, "unsubscribe", 30, 60 * 60_000)) return back("busy");
  if (!id || !unsubscribeTokenMatches(id, token)) return back("invalid");

  const store = getStore();
  const registration = await store.getRegistration(id);
  if (!registration) return back("invalid");
  const webinar = await store.getWebinar(registration.webinarId);
  const email = registration.email.toLowerCase();
  const at = new Date().toISOString();
  // Every registration this person has in the workspace, so they aren't mailed again for another webinar.
  const siblings = webinar ? (await store.listWorkspaceRegistrations(webinar.workspaceId, 5000)).filter((r) => r.email.toLowerCase() === email) : [registration];
  for (const r of siblings.length ? siblings : [registration]) {
    if (r.metadata?.unsubscribedAt) continue;
    await store.updateRegistration(r.id, { metadata: { ...(r.metadata ?? {}), unsubscribedAt: at } });
  }
  return back("done");
}
