import { validateVideoUrl } from "@/providers/video";
import type {
  SectionEvaluation,
  WebinarWorkflowConfig,
  WorkflowDataSectionKey,
  WorkflowEvaluation,
  WorkflowIssue,
  WorkflowSectionKey,
} from "@/types";
import { DATA_SECTION_KEYS } from "./defaults";
import { validateTicketSettings } from "@/lib/pricing/ticket";
import { pageDesignSchema } from "@/lib/page-design/schema";
import { clipPreviewSupported, DEFAULT_VIDEO_PREVIEW } from "./preview";
import { isValidLocalDate, isValidTimeZone, resolveSessions, zonedDateTimeToUtc } from "./time";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GA_ID_RE = /^G-[A-Z0-9]{4,20}$/;
export const META_PIXEL_RE = /^\d{8,20}$/;
const HOSTNAME_RE = /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$|^localhost$/;

export function isHttpsUrl(value: string, allowHttpLocal = false): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return allowHttpLocal && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function isValidHostname(value: string): boolean {
  return HOSTNAME_RE.test(value.trim().toLowerCase());
}

const REQUIRED: Record<WorkflowSectionKey, boolean> = {
  configuration: true,
  schedules: true,
  registration: true,
  notifications: false,
  integrations: true,
  thankYou: false,
  live: false,
  replay: false,
  finish: false,
};

interface Ctx {
  now: Date;
}

type Check = (config: WebinarWorkflowConfig, ctx: Ctx) => { issues: WorkflowIssue[]; complete: boolean };

const err = (section: WorkflowSectionKey, message: string, field?: string): WorkflowIssue => ({ section, severity: "error", message, field });
const warn = (section: WorkflowSectionKey, message: string, field?: string): WorkflowIssue => ({ section, severity: "warning", message, field });

function checkEmail(section: WorkflowSectionKey, label: string, message: { enabled: boolean; subject: string; body: string }, issues: WorkflowIssue[], field: string) {
  if (!message.enabled) return;
  if (!message.subject.trim()) issues.push(err(section, `${label}: add an email subject.`, `${field}.subject`));
  if (!message.body.trim()) issues.push(err(section, `${label}: add an email message.`, `${field}.body`));
}

function videoIssues(section: WorkflowSectionKey, label: string, provider: Parameters<typeof validateVideoUrl>[0], url: string, issues: WorkflowIssue[], field: string, required: boolean) {
  if (!url.trim()) {
    if (required) issues.push(err(section, `${label}: add a video URL.`, field));
    return;
  }
  if (!validateVideoUrl(provider, url)) issues.push(err(section, `${label}: the URL does not match the selected provider.`, field));
  else if (!/^https:\/\//i.test(url.trim()) && provider !== "uploaded_video") issues.push(err(section, `${label}: use an https:// URL.`, field));
}

const checks: Record<WorkflowDataSectionKey, Check> = {
  configuration(config) {
    const c = config.configuration;
    const issues: WorkflowIssue[] = [];
    if (c.title.trim().length < 3) issues.push(err("configuration", "Add a webinar title (at least 3 characters).", "title"));
    if (c.description.trim().length < 10) issues.push(err("configuration", "Add a short description (at least 10 characters).", "description"));
    if (!c.hostName.trim()) issues.push(err("configuration", "Add the webinar host name.", "hostName"));
    if (c.hostEmail && !EMAIL_RE.test(c.hostEmail)) issues.push(err("configuration", "Host email is not a valid email address.", "hostEmail"));
    if (!c.mode) issues.push(err("configuration", "Choose how this webinar runs: Right now, Schedule for later or Always on.", "mode"));
    if (c.coverImageUrl && !isHttpsUrl(c.coverImageUrl)) issues.push(err("configuration", "Cover image must be an https:// URL.", "coverImageUrl"));
    c.presenters.forEach((p, i) => {
      if (!p.name.trim()) issues.push(err("configuration", `Presenter ${i + 1}: add a name or remove the presenter.`, `presenters.${i}`));
      if (p.avatarUrl && !isHttpsUrl(p.avatarUrl)) issues.push(err("configuration", `Presenter ${i + 1}: photo must be an https:// URL.`, `presenters.${i}`));
    });
    return { issues, complete: issues.length === 0 };
  },

  schedules(config, ctx) {
    const s = config.schedules;
    const mode = config.configuration.mode;
    const issues: WorkflowIssue[] = [];
    if (!mode) {
      return { issues: [warn("schedules", "Choose a configuration mode first; scheduling options depend on it.", "mode")], complete: false };
    }
    if (!isValidTimeZone(s.timezone)) issues.push(err("schedules", "Choose a valid timezone.", "timezone"));
    if (s.durationMinutes < 5) issues.push(err("schedules", "Duration must be at least 5 minutes.", "durationMinutes"));

    let firstStart: Date | null = null;
    let lastStart: Date | null = null;

    if (mode === "schedule_later") {
      if (s.sessions.length === 0) issues.push(err("schedules", "Add at least one session date and time.", "sessions"));
      s.sessions.forEach((session, i) => {
        if (!session.date || !session.time) issues.push(err("schedules", `Session ${i + 1}: choose a date and start time.`, `sessions.${i}`));
      });
      const resolved = resolveSessions(s).filter((r) => r.status !== "cancelled");
      if (s.sessions.length > 0 && resolved.length === 0 && issues.length === 0) {
        issues.push(err("schedules", "None of the sessions resolve to a valid date and time.", "sessions"));
      }
      const upcoming = resolved.filter((r) => new Date(r.startsAt) > ctx.now);
      if (resolved.length > 0 && upcoming.length === 0) {
        issues.push(err("schedules", "All sessions are in the past. Scheduled webinars need a future start time.", "sessions"));
      } else if (resolved.length > upcoming.length) {
        issues.push(warn("schedules", "Some sessions are already in the past and won't accept registrations.", "sessions"));
      }
      if (s.recurrence.enabled) {
        if ((s.recurrence.pattern === "weekly" || s.recurrence.pattern === "custom") && s.recurrence.daysOfWeek.length === 0) {
          issues.push(err("schedules", "Pick at least one weekday for the recurring schedule.", "recurrence.daysOfWeek"));
        }
        if (s.recurrence.endDate && !isValidLocalDate(s.recurrence.endDate)) issues.push(err("schedules", "Recurrence end date is invalid.", "recurrence.endDate"));
        if (s.recurrence.endDate && s.sessions[0]?.date && s.recurrence.endDate < s.sessions[0].date) {
          issues.push(err("schedules", "Recurrence end date is before the first session.", "recurrence.endDate"));
        }
      }
      if (upcoming.length > 0) {
        firstStart = new Date(upcoming[0].startsAt);
        lastStart = new Date(upcoming[upcoming.length - 1].startsAt);
      }
    }

    if (mode === "always_on") {
      const e = s.evergreen;
      if (e.type === "daily_slots" && e.dailySlots.filter(Boolean).length === 0) issues.push(err("schedules", "Add at least one daily session time.", "evergreen.dailySlots"));
      if ((e.type === "recurring_days" || e.type === "daily_slots") && e.allowedDays.length === 0) issues.push(err("schedules", "Select the days the evergreen webinar is available.", "evergreen.allowedDays"));
      if (e.type === "recurring_days" && e.dailySlots.filter(Boolean).length === 0) issues.push(err("schedules", "Add a session time for the selected days.", "evergreen.dailySlots"));
    }

    if (mode === "right_now" && s.sessions.length > 0) {
      issues.push(warn("schedules", "Saved session dates are ignored while the webinar is set to Right now.", "sessions"));
    }

    const opens = s.registrationOpensAt ? zonedDateTimeToUtc(s.registrationOpensAt, s.timezone) : null;
    const closes = s.registrationClosesAt ? zonedDateTimeToUtc(s.registrationClosesAt, s.timezone) : null;
    if (s.registrationOpensAt && !opens) issues.push(err("schedules", "Registration opening date is invalid.", "registrationOpensAt"));
    if (s.registrationClosesAt && !closes) issues.push(err("schedules", "Registration closing date is invalid.", "registrationClosesAt"));
    if (opens && closes && closes <= opens) issues.push(err("schedules", "Registration must close after it opens.", "registrationClosesAt"));
    if (closes && closes <= ctx.now) issues.push(warn("schedules", "Registration closing date is in the past, so the form will not accept registrations.", "registrationClosesAt"));
    if (closes && lastStart && closes > lastStart) issues.push(warn("schedules", "Registration closes after the last session starts.", "registrationClosesAt"));
    if (opens && firstStart && opens >= firstStart) issues.push(err("schedules", "Registration opens after the first session starts.", "registrationOpensAt"));

    return { issues, complete: !issues.some((i) => i.severity === "error") };
  },

  registration(config) {
    const r = config.registration;
    const issues: WorkflowIssue[] = [];
    if (!r.headline.trim()) issues.push(err("registration", "Add a registration page headline.", "headline"));
    if (!r.buttonText.trim()) issues.push(err("registration", "Add registration button text.", "buttonText"));
    if (r.coverImageUrl && !isHttpsUrl(r.coverImageUrl)) issues.push(err("registration", "Registration cover image must be an https:// URL.", "coverImageUrl"));
    if (r.page?.enabled && !pageDesignSchema.safeParse(r.page).success) {
      issues.push(err("registration", "The custom page design has a problem. Open the page designer to fix it, or switch back to the standard layout.", "page"));
    }
    if (r.showVideoPreview) {
      const preview = r.videoPreview ?? DEFAULT_VIDEO_PREVIEW;
      if (preview.source === "custom") {
        if (!preview.customUrl.trim()) issues.push(err("registration", "Add a short preview video, or switch the preview to a clip of the webinar video.", "videoPreview"));
        else if (!clipPreviewSupported(preview.customUrl)) issues.push(err("registration", "The preview video must be a YouTube, Vimeo or direct video (https) link.", "videoPreview"));
      } else if (config.integrations.video.url.trim() && !clipPreviewSupported(config.integrations.video.url)) {
        issues.push(warn("registration", "A clip preview needs a YouTube, Vimeo or direct video link as the webinar video. Use a separate short preview video instead, or the preview won't be shown.", "videoPreview"));
      }
    }
    r.customQuestions.forEach((q, i) => {
      if (!q.label.trim()) issues.push(err("registration", `Custom question ${i + 1}: add a label.`, `customQuestions.${i}`));
      if (q.type === "select" && q.options.filter((o) => o.trim()).length < 2) {
        issues.push(err("registration", `Custom question ${i + 1}: dropdowns need at least two options.`, `customQuestions.${i}`));
      }
    });
    r.embed.allowedDomains.forEach((d) => {
      if (!isValidHostname(d)) issues.push(err("registration", `"${d}" is not a valid domain (use example.com or *.example.com).`, "embed.allowedDomains"));
    });
    if (!r.embed.popupButtonText.trim() || !r.embed.buttonText.trim()) issues.push(err("registration", "Embed button text cannot be empty.", "embed"));
    return { issues, complete: issues.length === 0 };
  },

  notifications(config) {
    const n = config.notifications;
    const issues: WorkflowIssue[] = [];
    checkEmail("notifications", "Confirmation email", n.confirmation, issues, "confirmation");
    n.reminders.forEach((r, i) => checkEmail("notifications", `Reminder ${i + 1}`, r, issues, `reminders.${i}`));
    if (n.startingEmail) checkEmail("notifications", "Starting-now email", n.startingEmail, issues, "startingEmail");
    checkEmail("notifications", "Thank-you email", n.thankYouEmail, issues, "thankYouEmail");
    checkEmail("notifications", "Replay email", n.replayEmail, issues, "replayEmail");
    n.followUps.forEach((f, i) => checkEmail("notifications", `Follow-up ${i + 1}`, f, issues, `followUps.${i}`));
    if ((n.host.newRegistration || n.host.readiness) && !EMAIL_RE.test(n.host.recipientEmail)) {
      issues.push(err("notifications", "Host notifications need a valid recipient email.", "host.recipientEmail"));
    }
    if (n.replayEmail.enabled && !config.replay.enabled) {
      issues.push(warn("notifications", "Replay email is on but replay is disabled, so it will not be sent.", "replayEmail"));
    }
    return { issues, complete: issues.length === 0 };
  },

  integrations(config) {
    const i = config.integrations;
    const issues: WorkflowIssue[] = [];
    videoIssues("integrations", "Webinar video", i.video.provider, i.video.url, issues, "video.url", true);
    const tiered = (i.payment.tiers?.length ?? 0) > 0;
    if (i.payment.enabled && !tiered && !(i.payment.price > 0)) issues.push(err("integrations", "Paid registration needs a price above zero, or at least one ticket option.", "payment.price"));
    if (i.payment.enabled) {
      for (const message of validateTicketSettings(i.payment)) issues.push(err("integrations", message, "payment.tiers"));
    }
    if (i.analytics.googleAnalyticsId && !GA_ID_RE.test(i.analytics.googleAnalyticsId)) {
      issues.push(err("integrations", "Google Analytics ID must look like G-XXXXXXX.", "analytics.googleAnalyticsId"));
    }
    if (i.analytics.metaPixelId && !META_PIXEL_RE.test(i.analytics.metaPixelId)) {
      issues.push(err("integrations", "Meta Pixel ID must be numeric.", "analytics.metaPixelId"));
    }
    if (i.webhook.enabled && !isHttpsUrl(i.webhook.url)) issues.push(err("integrations", "Webhook URL must be an https:// URL.", "webhook.url"));
    return { issues, complete: !issues.some((x) => x.severity === "error") };
  },

  thankYou(config) {
    const t = config.thankYou;
    const issues: WorkflowIssue[] = [];
    if (!t.headline.trim()) issues.push(err("thankYou", "Add a thank-you headline.", "headline"));
    if (!t.message.trim()) issues.push(err("thankYou", "Add a confirmation message.", "message"));
    if (t.redirectUrl && !isHttpsUrl(t.redirectUrl)) issues.push(err("thankYou", "Redirect URL must be an https:// URL.", "redirectUrl"));
    return { issues, complete: issues.length === 0 };
  },

  live(config) {
    const l = config.live;
    const issues: WorkflowIssue[] = [];
    if (l.cta.enabled) {
      if (!l.cta.label.trim()) issues.push(err("live", "Call to action: add a button label.", "cta.label"));
      if (!isHttpsUrl(l.cta.url)) issues.push(err("live", "Call to action: use an https:// URL.", "cta.url"));
    }
    if (l.access === "anyone_with_link" && config.integrations.payment.enabled) {
      issues.push(err("live", "Paid webinars must restrict the room to verified registrants.", "access"));
    }
    if (!config.integrations.video.url.trim()) {
      issues.push(warn("live", "The room has no video yet. Add one under Integrations.", "video"));
    }
    return { issues, complete: !issues.some((x) => x.severity === "error") };
  },

  replay(config, ctx) {
    const r = config.replay;
    const issues: WorkflowIssue[] = [];
    if (!r.enabled) return { issues, complete: true };
    if (r.useLiveVideo) {
      if (!config.integrations.video.url.trim()) issues.push(err("replay", "Replay uses the live video, but no video is set under Integrations.", "video"));
    } else {
      videoIssues("replay", "Replay video", r.video.provider, r.video.url, issues, "video.url", true);
    }
    if (r.sales?.enabled) {
      if (!(r.sales.price > 0)) issues.push(err("replay", "Set a replay price above zero, or turn off replay sales.", "sales.price"));
      if (r.access === "anyone_with_link") issues.push(err("replay", "A replay that is for sale can't also be open to anyone with the link. Choose another access rule.", "access"));
      if (r.access === "paid_only") issues.push(err("replay", "Replay sales and \"paid registrants only\" conflict. Choose \"All registrants\" or \"Attended only\" and let the sale decide who pays.", "access"));
    }
    if (r.access === "paid_only" && !config.integrations.payment.enabled) {
      issues.push(err("replay", "Replay is limited to paid registrants, but paid registration is off.", "access"));
    }
    if (r.access === "anyone_with_link" && config.integrations.payment.enabled) {
      issues.push(warn("replay", "Anyone with the link can watch the replay of this paid webinar.", "access"));
    }
    if (r.expiration === "date") {
      if (!isValidLocalDate(r.expiresOn)) issues.push(err("replay", "Choose a replay expiry date.", "expiresOn"));
      else {
        const expiry = zonedDateTimeToUtc(`${r.expiresOn}T23:59`, config.schedules.timezone);
        if (expiry && expiry <= ctx.now) issues.push(err("replay", "Replay expiry date is in the past.", "expiresOn"));
      }
    }
    if (config.configuration.mode === "always_on" && r.availability === "after_session") {
      issues.push(warn("replay", "Always-on webinars have no single end time; replay opens after each attendee's session.", "availability"));
    }
    return { issues, complete: !issues.some((x) => x.severity === "error") };
  },
};

export function evaluateWorkflow(
  config: WebinarWorkflowConfig,
  options: { published?: boolean; dirtySections?: WorkflowSectionKey[]; reviewedSections?: WorkflowSectionKey[]; now?: Date } = {},
): WorkflowEvaluation {
  const ctx: Ctx = { now: options.now ?? new Date() };
  const reviewed = new Set<WorkflowSectionKey>([...(config.reviewedSections ?? []), ...(options.reviewedSections ?? [])]);
  const sections = {} as Record<WorkflowSectionKey, SectionEvaluation>;
  const blockingIssues: WorkflowIssue[] = [];

  for (const key of DATA_SECTION_KEYS) {
    const { issues, complete } = checks[key](config, ctx);
    const hasErrors = issues.some((i) => i.severity === "error");
    // Publishing already confirmed any warnings shown on the review step.
    const hasWarnings = !options.published && issues.some((i) => i.severity === "warning");
    const touched = sectionHasUserInput(config, key);
    let state: SectionEvaluation["state"];
    // Valid defaults alone don't earn a tick: the owner must have worked through the section
    // (or published the webinar, which confirms every setting shown on the review step).
    const workedThrough = Boolean(options.published) || reviewed.has(key) || (!DEFAULT_VALID_SECTIONS.has(key) && touched);
    // The tick follows the current draft as it's edited (no waiting for a save), and a section with
    // anything still unresolved, warnings included, never shows as complete.
    if (complete && !hasWarnings && workedThrough) state = "completed";
    else if (hasErrors && (touched || REQUIRED[key])) state = touched ? "attention" : "incomplete";
    else if (hasWarnings && workedThrough) state = "attention";
    else state = "incomplete";
    sections[key] = { state, issues, required: REQUIRED[key] };
    blockingIssues.push(...issues.filter((i) => i.severity === "error"));
  }

  const canPublish = blockingIssues.length === 0;
  sections.finish = {
    state: options.published && canPublish ? "completed" : canPublish ? "incomplete" : "attention",
    issues: [],
    required: false,
  };

  return { sections, canPublish, blockingIssues };
}

/** Sections whose default settings are already valid, so only an explicit review can complete them. */
const DEFAULT_VALID_SECTIONS = new Set<WorkflowSectionKey>(["notifications", "thankYou", "live", "replay"]);

/**
 * Whether the user has started filling a section. An untouched required section
 * shows "incomplete"; a touched section with errors shows "attention required".
 */
function sectionHasUserInput(config: WebinarWorkflowConfig, key: WorkflowDataSectionKey): boolean {
  switch (key) {
    case "configuration":
      return Boolean(config.configuration.title || config.configuration.description || config.configuration.mode);
    case "schedules":
      return config.schedules.sessions.length > 0 || Boolean(config.schedules.registrationOpensAt || config.schedules.registrationClosesAt);
    case "registration":
      return Boolean(config.registration.headline || config.registration.customQuestions.length || config.registration.embed.allowedDomains.length);
    case "integrations":
      return Boolean(config.integrations.video.url || config.integrations.payment.enabled || config.integrations.webhook.enabled || config.integrations.analytics.googleAnalyticsId || config.integrations.analytics.metaPixelId);
    default:
      return true;
  }
}
