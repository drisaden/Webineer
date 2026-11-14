import { getAuthMode } from "@/lib/supabase/config";
import { getAppSession } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";
import { getStore } from "@/server/repositories";
import { initialWorkflows } from "@/services/automation-engine";

export interface AutomationView {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: string;
  steps: string[];
  executionCount: number;
  updatedAt: string;
}

export interface AutomationOverview {
  demo: boolean;
  enabled: number;
  runsToday: number;
  pending: number;
  failed: number;
  workflows: AutomationView[];
}

/** Each webinar's email sequence is an automation; counts come from automation_jobs/job_runs. */
export async function getAutomationOverview(): Promise<AutomationOverview | null> {
  if (getAuthMode() !== "supabase") {
    return {
      demo: true,
      enabled: initialWorkflows.filter((f) => f.enabled).length,
      runsToday: 224,
      pending: 19,
      failed: 0,
      workflows: initialWorkflows.map((w) => ({ id: w.id, name: w.name, description: w.description, enabled: w.enabled, trigger: w.trigger, steps: w.steps.map((s) => (s.type === "action" ? String(s.actionType) : s.type)), executionCount: w.executionCount, updatedAt: w.updatedAt })),
    };
  }
  const app = await getAppSession();
  if (!app) return null;
  const orgId = app.organization.id;
  const db = getPrisma();
  const dayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const [webinars, runsToday, pending, failed, perWebinar] = await Promise.all([
    getStore().listWebinars(orgId),
    db.jobRun.count({ where: { startedAt: { gte: dayStart }, job: { organizationId: orgId } } }),
    db.automationJob.count({ where: { organizationId: orgId, status: { in: ["PENDING", "RUNNING"] } } }),
    db.automationJob.count({ where: { organizationId: orgId, status: "FAILED" } }),
    db.$queryRaw<{ webinar_id: string; n: number }[]>`
      SELECT payload->>'webinarId' AS webinar_id, count(*)::int AS n FROM automation_jobs
      WHERE organization_id = ${orgId}::uuid AND type = 'notification.send' AND status = 'SUCCEEDED'
      GROUP BY 1`,
  ]);
  const counts = new Map(perWebinar.map((r) => [r.webinar_id, r.n]));
  const workflows = webinars
    .filter((w) => w.workflow)
    .map((w) => {
      const n = w.workflow!.notifications;
      const steps = [
        n.confirmation.enabled ? "confirmation" : null,
        ...n.reminders.filter((r) => r.enabled).map((r) => (r.minutesBefore >= 60 ? `reminder ${Math.round(r.minutesBefore / 60)}h before` : `reminder ${r.minutesBefore}m before`)),
        n.thankYouEmail.enabled ? "thank you" : null,
        w.workflow!.replay.enabled && n.replayEmail.enabled ? "replay" : null,
        ...n.followUps.filter((f) => f.enabled).map((f) => `follow-up +${f.minutesAfter >= 60 ? `${Math.round(f.minutesAfter / 60)}h` : `${f.minutesAfter}m`}`),
      ].filter((s): s is string => !!s);
      return {
        id: w.id,
        name: `${w.title} · email sequence`,
        description: `Timed in ${w.workflow!.schedules.timezone}. Reminders follow each registrant's own session${w.workflow!.schedules.recurrence.enabled ? ", including recurring dates" : ""}.`,
        enabled: !["draft", "paused"].includes(w.status) && steps.length > 0,
        trigger: "registration_completed",
        steps,
        executionCount: counts.get(w.id) ?? 0,
        updatedAt: w.updatedAt,
      };
    });
  return { demo: false, enabled: workflows.filter((w) => w.enabled).length, runsToday, pending, failed, workflows };
}
