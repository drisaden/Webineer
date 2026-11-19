import { formatDayWithWeekday, formatTime } from "@/lib/datetime";
import { startingEmailOf } from "@/lib/webinar-workflow/defaults";
import { applyPlaceholders, renderEmailHtml, type EmailVariables } from "@/lib/webinar-workflow/email-render";
import { primarySessionWindow } from "@/lib/webinar-workflow/sync";
import { formatInZone } from "@/lib/webinar-workflow/time";
import { getEmailProvider } from "@/providers/email";
import { dispatchWebhook } from "@/providers/webhooks/dispatcher";
import { accessKeyFor } from "@/server/access-keys";
import { getStore } from "@/server/repositories";
import type { EmailMessageSettings, EmailTemplateType, Registration, Webinar } from "@/types";

/**
 * Workflow notifications are sent through the single email provider
 * abstraction: an in-memory log in demo mode, the SMTP outbox (email_logs,
 * dedupe keys, retries) everywhere else.
 */

export function registrationAccessKey(registration: Registration): string {
  return accessKeyFor(registration);
}

export function personalLinks(webinar: Webinar, registration: Registration, origin: string) {
  const query = `r=${encodeURIComponent(registration.id)}&k=${encodeURIComponent(registrationAccessKey(registration))}`;
  const slug = webinar.slug ?? webinar.id;
  return {
    joinLink: `${origin}/room/${slug}?${query}`,
    replayLink: `${origin}/replay/${slug}?${query}`,
  };
}

export function sessionStartFor(webinar: Webinar, registration?: Registration): Date {
  const chosen = registration?.metadata?.sessionStartsAt;
  if (typeof chosen === "string" && !Number.isNaN(new Date(chosen).getTime())) return new Date(chosen);
  return primarySessionWindow(webinar).startsAt;
}

export function buildEmailVariables(webinar: Webinar, registration: Registration, origin: string): EmailVariables {
  const config = webinar.workflow;
  const tz = config?.schedules.timezone ?? webinar.schedule.timezone;
  const start = sessionStartFor(webinar, registration);
  const links = personalLinks(webinar, registration, origin);
  return {
    first_name: registration.name.split(/\s+/)[0] ?? registration.name,
    webinar_title: webinar.title,
    webinar_date: formatDayWithWeekday(start, tz),
    webinar_time: formatTime(start, tz),
    webinar_timezone: tz,
    join_link: links.joinLink,
    replay_link: links.replayLink,
    host_name: config?.configuration.hostName ?? "",
  };
}

export async function sendWorkflowEmail(
  webinar: Webinar,
  registration: Registration,
  message: EmailMessageSettings,
  templateType: EmailTemplateType,
  origin: string,
  dedupeKey?: string,
) {
  if (!message.enabled) return null;
  const variables = buildEmailVariables(webinar, registration, origin);
  return getEmailProvider().sendEmail({
    workspaceId: webinar.workspaceId,
    webinarId: webinar.id,
    registrationId: registration.id,
    dedupeKey,
    recipientEmail: registration.email,
    recipientName: registration.name,
    templateType,
    subjectOverride: message.subject,
    variables,
    bodyText: applyPlaceholders(message.body, variables),
    bodyHtml: renderEmailHtml(message.body, variables),
  });
}

/** Everything that happens once a registration is confirmed (free or paid & verified). */
export async function onRegistrationConfirmed(webinar: Webinar, registration: Registration, origin: string) {
  const config = webinar.workflow;
  if (!config) return;
  await sendWorkflowEmail(webinar, registration, config.notifications.confirmation, "registration_confirmation", origin, `confirm:${registration.id}`);

  if (config.notifications.host.newRegistration && config.notifications.host.recipientEmail) {
    await getEmailProvider().sendEmail({
      workspaceId: webinar.workspaceId,
      webinarId: webinar.id,
      recipientEmail: config.notifications.host.recipientEmail,
      recipientName: config.configuration.hostName,
      templateType: "host_new_registration",
      dedupeKey: `host-new:${registration.id}`,
      registrationId: registration.id,
      subjectOverride: `New registration for ${webinar.title}: ${registration.name}`,
      variables: {},
      bodyText: `${registration.name} <${registration.email}> registered via ${registration.source}.`,
    });
  }

  if (config.integrations.webhook.enabled && config.integrations.webhook.url && config.integrations.webhook.secret) {
    const delivery = dispatchWebhook(
      {
        id: `wh_${webinar.id}`,
        workspaceId: webinar.workspaceId,
        url: config.integrations.webhook.url,
        name: `${webinar.title} registrations`,
        subscribedEvents: ["registration_completed"],
        secretKey: config.integrations.webhook.secret,
        enabled: true,
        createdAt: webinar.createdAt,
      },
      "registration_completed",
      {
        webinarId: webinar.id,
        webinarTitle: webinar.title,
        registrationId: registration.id,
        name: registration.name,
        email: registration.email,
        source: registration.source,
        registeredAt: registration.registeredAt,
      },
    ).catch(() => null);
    // Bound the wait so a slow receiver can't hold up the attendee's response.
    await Promise.race([delivery, new Promise((resolve) => setTimeout(resolve, 3000))]);
  }
}

interface DueNotification {
  key: string;
  registration: Registration;
  message: EmailMessageSettings;
  templateType: EmailTemplateType;
}

const DUE_WINDOW_MS = 30 * 60_000;

/**
 * Compute notifications that are due now. Designed to be invoked by a Vercel
 * Cron job (or any scheduler) every few minutes; idempotency keys stored on the
 * webinar prevent duplicates across runs. Notifications more than 30 minutes
 * overdue are skipped rather than sent late.
 */
export async function computeDueNotifications(webinar: Webinar, now = new Date()): Promise<DueNotification[]> {
  const config = webinar.workflow;
  if (!config || webinar.status === "draft") return [];
  const sent = new Set(config.sentNotificationKeys ?? []);
  const registrations = (await getStore().listRegistrations(webinar.id))
    .filter((r) => r.status !== "cancelled" && r.paymentStatus !== "pending" && r.metadata?.replayOnly !== true);
  const durationMs = config.schedules.durationMinutes * 60_000;
  const due: DueNotification[] = [];

  const consider = (key: string, at: Date, registration: Registration, message: EmailMessageSettings, templateType: EmailTemplateType) => {
    if (!message.enabled || sent.has(key)) return;
    const delta = now.getTime() - at.getTime();
    if (delta >= 0 && delta <= DUE_WINDOW_MS) due.push({ key, registration, message, templateType });
  };

  for (const registration of registrations) {
    const start = sessionStartFor(webinar, registration);
    const end = new Date(start.getTime() + durationMs);
    const sessionKey = start.toISOString();
    for (const reminder of config.notifications.reminders) {
      const type: EmailTemplateType = reminder.minutesBefore >= 1440 ? "reminder_24h" : reminder.minutesBefore >= 60 ? "reminder_1h" : "reminder_15m";
      consider(`${registration.id}:${sessionKey}:${reminder.id}`, new Date(start.getTime() - reminder.minutesBefore * 60_000), registration, reminder, type);
    }
    consider(`${registration.id}:${sessionKey}:starting`, start, registration, startingEmailOf(config.notifications), "starting_now");
    consider(`${registration.id}:${sessionKey}:thank_you`, new Date(end.getTime() + config.notifications.thankYouEmail.minutesAfter * 60_000), registration, config.notifications.thankYouEmail, "thank_you");
    if (config.replay.enabled) {
      consider(`${registration.id}:${sessionKey}:replay`, end, registration, config.notifications.replayEmail, "replay_available");
    }
    for (const followUp of config.notifications.followUps) {
      consider(`${registration.id}:${sessionKey}:${followUp.id}`, new Date(end.getTime() + followUp.minutesAfter * 60_000), registration, followUp, "post_webinar_followup");
    }
  }
  return due;
}

export async function runScheduledNotifications(origin: string, now = new Date()) {
  let sentCount = 0;
  const store = getStore();
  for (const webinar of await store.listActiveWebinars()) {
    const due = await computeDueNotifications(webinar, now);
    if (due.length === 0) continue;
    const keys = new Set(webinar.workflow?.sentNotificationKeys ?? []);
    for (const item of due) {
      // The key also dedupes in email_logs, so overlapping cron runs can't send twice.
      await sendWorkflowEmail(webinar, item.registration, item.message, item.templateType, origin, `notify:${item.key}`);
      keys.add(item.key);
      sentCount += 1;
    }
    // Re-read so concurrent edits made while emails were sending are kept.
    // (Phase 6 moves this bookkeeping to the automation_jobs / email_logs tables.)
    const latest = (await store.getWebinar(webinar.id)) ?? webinar;
    if (latest.workflow) {
      await store.updateWebinar({ ...latest, workflow: { ...latest.workflow, sentNotificationKeys: Array.from(keys).slice(-5000) } });
    }
  }
  return { sent: sentCount };
}
