import { getAuthMode } from "@/lib/supabase/config";
import { originFromRequest } from "@/lib/server/request-origin";
import { tick } from "@/server/jobs/automation";
import { runScheduledNotifications } from "@/services/workflow-notifications";
import { cronAuthorized } from "@/server/jobs/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Backwards-compatible entry point. With a database this runs the full automation tick
 * (same as /api/cron/tick); in demo mode it sends due notifications from the mock store.
 */
export async function GET(request: Request) {
  const auth = cronAuthorized(request);
  if (auth === null) return Response.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (getAuthMode() === "demo") return Response.json(await runScheduledNotifications(originFromRequest(request)));
  const result = await tick({ budgetMs: 40_000 });
  return Response.json({ sent: result.succeeded, ...result });
}
