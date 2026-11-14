import { getAuthMode } from "@/lib/supabase/config";
import { tick } from "@/server/jobs/automation";
import { cronAuthorized } from "@/server/jobs/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduler tick: plans and runs automation jobs (reminders, follow-ups, replay emails,
 * webinar status, payment reconciliation, plan expiry, email retries, cleanup).
 * Call every 5 minutes with `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends it
 * automatically; see supabase/cron.sql for pg_cron on any Vercel plan). Safe to call
 * concurrently or repeatedly: all work is deduplicated in the database.
 */
export async function GET(request: Request) {
  const auth = cronAuthorized(request);
  if (auth === null) return Response.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (getAuthMode() === "demo") return Response.json({ error: "Automation runs on the database only." }, { status: 409 });
  const started = Date.now();
  const result = await tick({ budgetMs: 40_000 });
  return Response.json({ ...result, ms: Date.now() - started });
}
