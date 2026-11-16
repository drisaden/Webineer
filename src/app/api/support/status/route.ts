import { getAppSession } from "@/server/auth/session";
import { limitOr429 } from "@/lib/server/http";
import { demoModeResponse, errorResponse, noStore } from "@/server/support/http";
import { supportContact } from "@/server/support/config";
import { supportStatus } from "@/server/support/service";

export const dynamic = "force-dynamic";

/** Is an agent online, the phone number and hours, and (when signed in) how many replies are unread. */
export async function GET(request: Request) {
  const limited = await limitOr429(request, "support:status", 240, 10 * 60_000);
  if (limited) return limited;
  const demo = demoModeResponse();
  if (demo) {
    const c = supportContact();
    return noStore({ online: false, agentsOnline: 0, hours: c.hours, phone: c.phone, email: c.email, unread: null });
  }
  try {
    const app = await getAppSession().catch(() => null);
    return noStore(await supportStatus(app?.profile.id ?? null));
  } catch (error) {
    return errorResponse(error);
  }
}
