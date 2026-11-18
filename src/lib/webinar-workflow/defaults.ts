import type {
  WebinarWorkflowConfig,
  WorkflowDataSectionKey,
  WorkflowSectionKey,
} from "@/types";

/** Sent at the exact start time, so people who missed the reminders still get the join link when it matters. */
export const DEFAULT_STARTING_EMAIL = {
  enabled: true,
  subject: "{{webinar_title}} is starting now",
  body: "Hi {{first_name}},\n\n{{webinar_title}} is starting right now.\n\nJoin here: {{join_link}}",
};

/** The starting-now email for a webinar. Webinars saved before this existed use the default. */
export function startingEmailOf(notifications: { startingEmail?: { enabled: boolean; subject: string; body: string } }) {
  return notifications.startingEmail ?? DEFAULT_STARTING_EMAIL;
}

export const WORKFLOW_SECTIONS: { key: WorkflowSectionKey; label: string; description: string }[] = [
  { key: "configuration", label: "Configuration", description: "Identity, host and webinar mode" },
  { key: "schedules", label: "Schedules", description: "Dates, sessions and registration window" },
  { key: "registration", label: "Registration", description: "Form, page and embed & share" },
  { key: "notifications", label: "Notifications", description: "Confirmation, reminders and follow-ups" },
  { key: "integrations", label: "Integrations", description: "Video, payments, tracking and webhooks" },
  { key: "thankYou", label: "Thank You", description: "Post-registration experience" },
  { key: "live", label: "Live", description: "Attendee room and access" },
  { key: "replay", label: "Replay", description: "Replay availability and access" },
  { key: "finish", label: "Finish", description: "Review and publish" },
];

export const DATA_SECTION_KEYS: WorkflowDataSectionKey[] = [
  "configuration",
  "schedules",
  "registration",
  "notifications",
  "integrations",
  "thankYou",
  "live",
  "replay",
];

export const WEBINAR_CATEGORIES = [
  "Education",
  "Marketing",
  "Product demo",
  "Sales",
  "Training",
  "Coaching",
  "Community",
  "Other",
];

export const EMAIL_PLACEHOLDERS = [
  { token: "{{first_name}}", description: "Registrant's first name" },
  { token: "{{webinar_title}}", description: "Webinar title" },
  { token: "{{webinar_date}}", description: "Session date in the webinar timezone" },
  { token: "{{webinar_time}}", description: "Session start time" },
  { token: "{{webinar_timezone}}", description: "Webinar timezone" },
  { token: "{{join_link}}", description: "Personal room link" },
  { token: "{{replay_link}}", description: "Personal replay link" },
  { token: "{{host_name}}", description: "Host name" },
];

export function randomId(prefix: string, length = 10): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return prefix ? `${prefix}_${out}` : out;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function createDefaultWorkflowConfig(options: {
  hostName: string;
  hostEmail: string;
  timezone: string;
  /** The workspace currency; prices start in this currency. */
  currency?: "NGN" | "USD" | "EUR" | "GBP";
}): WebinarWorkflowConfig {
  return {
    publicId: randomId("", 14),
    version: 1,
    configuration: {
      title: "",
      description: "",
      coverImageUrl: "",
      hostName: options.hostName,
      hostEmail: options.hostEmail,
      category: "",
      presenters: [],
      mode: null,
    },
    schedules: {
      timezone: options.timezone,
      durationMinutes: 60,
      sessions: [],
      recurrence: {
        enabled: false,
        pattern: "weekly",
        interval: 1,
        daysOfWeek: [],
        occurrences: 4,
        endDate: "",
      },
      evergreen: {
        type: "next_interval",
        intervalMinutes: 30,
        dailySlots: ["10:00", "18:00"],
        allowedDays: [1, 2, 3, 4, 5],
      },
      registrationOpensAt: "",
      registrationClosesAt: "",
    },
    registration: {
      pageTitle: "",
      headline: "",
      description: "",
      coverImageUrl: "",
      buttonText: "Reserve my seat",
      accentColor: "#16D6B2",
      showDateTime: true,
      showPresenters: true,
      showVideoPreview: false,
      videoPreview: { source: "clip", clipPercent: 10, customUrl: "" },
      phoneField: "hidden",
      customQuestions: [],
      capacity: null,
      embed: {
        inlineHeight: 650,
        popupButtonText: "Register now",
        buttonText: "Register for the webinar",
        buttonBackground: "#041B5E",
        buttonTextColor: "#FFFFFF",
        buttonRadius: 12,
        allowedDomains: [],
      },
    },
    notifications: {
      confirmation: {
        enabled: true,
        subject: "You're registered: {{webinar_title}}",
        body:
          "Hi {{first_name}},\n\nYou're confirmed for **{{webinar_title}}**.\n\nDate: {{webinar_date}}\nTime: {{webinar_time}} ({{webinar_timezone}})\n\nJoin here: {{join_link}}\n\nSee you there,\n{{host_name}}",
      },
      reminders: [
        {
          id: "rem_24h",
          minutesBefore: 1440,
          enabled: true,
          subject: "Tomorrow: {{webinar_title}}",
          body: "Hi {{first_name}},\n\n{{webinar_title}} starts in 24 hours.\n\nJoin here: {{join_link}}",
        },
        {
          id: "rem_1h",
          minutesBefore: 60,
          enabled: true,
          subject: "Starting in 1 hour: {{webinar_title}}",
          body: "Hi {{first_name}},\n\nWe go live in one hour.\n\nJoin here: {{join_link}}",
        },
        {
          id: "rem_15m",
          minutesBefore: 15,
          enabled: false,
          subject: "Doors open: {{webinar_title}} in 15 minutes",
          body: "Hi {{first_name}},\n\nThe room opens in 15 minutes.\n\nJoin here: {{join_link}}",
        },
      ],
      host: {
        newRegistration: true,
        readiness: true,
        recipientEmail: options.hostEmail,
      },
      startingEmail: { ...DEFAULT_STARTING_EMAIL },
      thankYouEmail: {
        enabled: true,
        minutesAfter: 30,
        subject: "Thanks for joining {{webinar_title}}",
        body: "Hi {{first_name}},\n\nThank you for attending {{webinar_title}}. We hope it was useful.\n\n{{host_name}}",
      },
      replayEmail: {
        enabled: false,
        subject: "The replay is ready: {{webinar_title}}",
        body: "Hi {{first_name}},\n\nThe replay of {{webinar_title}} is now available.\n\nWatch here: {{replay_link}}",
      },
      followUps: [],
    },
    integrations: {
      video: { provider: "youtube", url: "", autoplay: false, muted: false, showControls: true },
      payment: { enabled: false, price: 0, currency: options.currency ?? "NGN" },
      analytics: { googleAnalyticsId: "", metaPixelId: "" },
      webhook: { enabled: false, url: "", secret: "" },
    },
    thankYou: {
      headline: "You're registered!",
      message: "Your seat is reserved. We've emailed your confirmation and personal join link.",
      joinInstructions: "Use the personal join link in your confirmation email. The room opens shortly before the session starts.",
      showWebinarDetails: true,
      addToCalendar: true,
      socialSharing: true,
      redirectUrl: "",
      redirectDelaySeconds: 5,
    },
    live: {
      access: "registered",
      entryOpensMinutesBefore: 15,
      allowLateJoin: true,
      lateJoinCutoffMinutes: 30,
      showPresenters: true,
      showDescription: true,
      chatEnabled: true,
      qaEnabled: true,
      pollsEnabled: true,
      reactionsEnabled: true,
      viewerCountEnabled: true,
      cta: { enabled: false, label: "", url: "", showAfterMinutes: 0 },
    },
    replay: {
      enabled: false,
      useLiveVideo: true,
      video: { provider: "youtube", url: "" },
      title: "",
      description: "",
      access: "all_registrants",
      availability: "after_session",
      expiration: "never",
      expiresOn: "",
      expiresAfterDays: 7,
    },
    sentNotificationKeys: [],
  };
}
