import { z } from "zod";
import type { WorkflowDataSectionKey } from "@/types";

/**
 * Structural validation for section payloads sent to the server. These schemas
 * enforce types, enums and size limits so a client can never store arbitrary
 * data. Business rules (required fields, conflicts) live in validation.ts so
 * drafts can be saved while incomplete.
 */

const str = (max: number) => z.string().max(max);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #16D6B2");
const localDate = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use YYYY-MM-DD");
const localTime = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, "Use HH:mm");
const localDateTime = z.string().regex(/^(\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d)?$/, "Use YYYY-MM-DDTHH:mm");
const videoProvider = z.enum([
  "youtube",
  "vimeo",
  "wistia",
  "custom_iframe",
  "custom_url",
  "uploaded_video",
  "external_live_stream",
]);

const emailMessage = z.object({
  enabled: z.boolean(),
  subject: str(200),
  body: str(5000),
});

export const sectionSchemas = {
  configuration: z.object({
    title: str(150),
    description: str(2000),
    coverImageUrl: str(1000),
    hostName: str(120),
    hostEmail: str(200),
    category: str(60),
    presenters: z
      .array(
        z.object({
          id: str(40),
          name: str(120),
          title: str(120),
          bio: str(1000),
          avatarUrl: str(1000),
        }),
      )
      .max(10),
    mode: z.enum(["right_now", "schedule_later", "always_on"]).nullable(),
  }),
  schedules: z.object({
    timezone: str(64),
    durationMinutes: z.number().int().min(0).max(1440),
    sessions: z
      .array(
        z.object({
          id: str(40),
          date: localDate,
          time: localTime,
          status: z.enum(["open", "closed", "cancelled"]),
        }),
      )
      .max(30),
    recurrence: z.object({
      enabled: z.boolean(),
      pattern: z.enum(["daily", "weekly", "weekdays", "custom"]),
      interval: z.number().int().min(1).max(30),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7),
      occurrences: z.number().int().min(1).max(52),
      endDate: localDate,
    }),
    evergreen: z.object({
      type: z.enum(["instant", "next_interval", "daily_slots", "recurring_days"]),
      intervalMinutes: z.number().int().min(5).max(1440),
      dailySlots: z.array(localTime).max(24),
      allowedDays: z.array(z.number().int().min(0).max(6)).max(7),
    }),
    registrationOpensAt: localDateTime,
    registrationClosesAt: localDateTime,
  }),
  registration: z.object({
    pageTitle: str(150),
    headline: str(200),
    description: str(3000),
    coverImageUrl: str(1000),
    buttonText: str(60),
    accentColor: hex,
    showDateTime: z.boolean(),
    showPresenters: z.boolean(),
    showVideoPreview: z.boolean(),
    phoneField: z.enum(["hidden", "optional", "required"]),
    customQuestions: z
      .array(
        z.object({
          id: str(40),
          label: str(200),
          type: z.enum(["text", "textarea", "select", "checkbox"]),
          options: z.array(str(100)).max(20),
          required: z.boolean(),
        }),
      )
      .max(10),
    capacity: z.number().int().min(1).max(1_000_000).nullable(),
    embed: z.object({
      inlineHeight: z.number().int().min(300).max(2000),
      popupButtonText: str(60),
      buttonText: str(60),
      buttonBackground: hex,
      buttonTextColor: hex,
      buttonRadius: z.number().int().min(0).max(40),
      allowedDomains: z.array(str(253)).max(20),
    }),
  }),
  notifications: z.object({
    confirmation: emailMessage,
    reminders: z
      .array(emailMessage.extend({ id: str(40), minutesBefore: z.number().int().min(1).max(20160) }))
      .max(6),
    host: z.object({
      newRegistration: z.boolean(),
      readiness: z.boolean(),
      recipientEmail: str(200),
    }),
    thankYouEmail: emailMessage.extend({ minutesAfter: z.number().int().min(0).max(10080) }),
    replayEmail: emailMessage,
    followUps: z
      .array(emailMessage.extend({ id: str(40), minutesAfter: z.number().int().min(0).max(43200) }))
      .max(5),
  }),
  integrations: z.object({
    video: z.object({
      provider: videoProvider,
      url: str(2000),
      autoplay: z.boolean(),
      muted: z.boolean(),
      showControls: z.boolean(),
    }),
    payment: z.object({
      enabled: z.boolean(),
      price: z.number().min(0).max(100_000_000),
      currency: z.enum(["NGN", "USD", "EUR", "GBP"]),
    }),
    analytics: z.object({
      googleAnalyticsId: str(30),
      metaPixelId: str(30),
    }),
    webhook: z.object({
      enabled: z.boolean(),
      url: str(2000),
      // The secret is server-managed; any client value is ignored.
      secret: str(200),
    }),
  }),
  thankYou: z.object({
    headline: str(150),
    message: str(2000),
    joinInstructions: str(2000),
    showWebinarDetails: z.boolean(),
    addToCalendar: z.boolean(),
    socialSharing: z.boolean(),
    redirectUrl: str(2000),
    redirectDelaySeconds: z.number().int().min(0).max(60),
  }),
  live: z.object({
    access: z.enum(["registered", "anyone_with_link"]),
    entryOpensMinutesBefore: z.number().int().min(0).max(240),
    allowLateJoin: z.boolean(),
    lateJoinCutoffMinutes: z.number().int().min(0).max(1440),
    showPresenters: z.boolean(),
    showDescription: z.boolean(),
    chatEnabled: z.boolean(),
    qaEnabled: z.boolean(),
    cta: z.object({
      enabled: z.boolean(),
      label: str(60),
      url: str(2000),
      showAfterMinutes: z.number().int().min(0).max(600),
    }),
  }),
  replay: z.object({
    enabled: z.boolean(),
    useLiveVideo: z.boolean(),
    video: z.object({ provider: videoProvider, url: str(2000) }),
    title: str(150),
    description: str(2000),
    access: z.enum(["all_registrants", "attended_only", "paid_only", "anyone_with_link"]),
    availability: z.enum(["immediately", "after_session"]),
    expiration: z.enum(["never", "date", "days_after"]),
    expiresOn: localDate,
    expiresAfterDays: z.number().int().min(1).max(365),
  }),
} satisfies Record<WorkflowDataSectionKey, z.ZodTypeAny>;

export const sectionPatchSchema = z
  .object({
    sections: z.object({
      configuration: sectionSchemas.configuration.optional(),
      schedules: sectionSchemas.schedules.optional(),
      registration: sectionSchemas.registration.optional(),
      notifications: sectionSchemas.notifications.optional(),
      integrations: sectionSchemas.integrations.optional(),
      thankYou: sectionSchemas.thankYou.optional(),
      live: sectionSchemas.live.optional(),
      replay: sectionSchemas.replay.optional(),
    }),
    /** Optimistic concurrency: the version the client last loaded. */
    baseVersion: z.number().int().min(1),
    /** Sections the owner has worked through (progress marker only; grants nothing). */
    reviewed: z
      .array(z.enum(["configuration", "schedules", "registration", "notifications", "integrations", "thankYou", "live", "replay"]))
      .max(8)
      .optional(),
  })
  .strict();

export const publicRegistrationSchema = z.object({
  publicId: z.string().min(6).max(40).regex(/^[A-Za-z0-9]+$/),
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  phone: z.string().trim().max(40).optional().default(""),
  sessionId: z.string().max(60).optional().default(""),
  answers: z.record(z.string().max(40), z.union([z.string().max(2000), z.boolean()])).optional().default({}),
  source: z.enum(["hosted", "inline", "popup", "button", "direct"]).default("direct"),
  embedOrigin: z.string().max(300).optional().default(""),
  /** Honeypot: must be empty. */
  website: z.string().max(200).optional().default(""),
  /** Client render timestamp (ms) used for a minimum fill-time check. */
  renderedAt: z.number().int().optional(),
});

export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>;
