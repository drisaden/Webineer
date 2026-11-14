import type { EvergreenScheduleType, VideoProviderValue } from "./index";

/**
 * Nine-section webinar workflow configuration.
 *
 * Stored on the existing `Webinar` record (`Webinar.workflow`) rather than in a
 * separate table, so the planned Prisma/Supabase migration only needs one JSONB
 * column. The service layer keeps the top-level Webinar fields (title, status,
 * schedule, videoSource, ...) in sync so existing pages keep working.
 */

export type WorkflowSectionKey =
  | "configuration"
  | "schedules"
  | "registration"
  | "notifications"
  | "integrations"
  | "thankYou"
  | "live"
  | "replay"
  | "finish";

/** Sections that hold editable data (Finish is a review step). */
export type WorkflowDataSectionKey = Exclude<WorkflowSectionKey, "finish">;

export type WebinarConfigurationMode = "right_now" | "schedule_later" | "always_on";

export interface WorkflowPresenter {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl: string;
}

export interface ConfigurationSettings {
  title: string;
  description: string;
  coverImageUrl: string;
  hostName: string;
  hostEmail: string;
  category: string;
  presenters: WorkflowPresenter[];
  mode: WebinarConfigurationMode | null;
}

export type SessionStatus = "open" | "closed" | "cancelled";

export interface WorkflowSession {
  id: string;
  /** Local date in the webinar timezone, YYYY-MM-DD */
  date: string;
  /** Local time in the webinar timezone, HH:mm */
  time: string;
  status: SessionStatus;
}

export type RecurrencePattern = "daily" | "weekly" | "weekdays" | "custom";

export interface WorkflowRecurrence {
  enabled: boolean;
  pattern: RecurrencePattern;
  /** Repeat every N days (daily/custom) or weeks (weekly) */
  interval: number;
  /** 0 = Sunday ... 6 = Saturday. Used by weekly and custom patterns. */
  daysOfWeek: number[];
  /** Stop after this many occurrences (bounded horizon; max 52). */
  occurrences: number;
  /** Optional last date YYYY-MM-DD */
  endDate: string;
}

export interface SchedulesSettings {
  timezone: string;
  durationMinutes: number;
  sessions: WorkflowSession[];
  recurrence: WorkflowRecurrence;
  evergreen: {
    type: EvergreenScheduleType;
    intervalMinutes: number;
    dailySlots: string[];
    allowedDays: number[];
  };
  /** Local datetime YYYY-MM-DDTHH:mm in the webinar timezone, or "" */
  registrationOpensAt: string;
  registrationClosesAt: string;
}

export type CustomQuestionType = "text" | "textarea" | "select" | "checkbox";

export interface CustomQuestion {
  id: string;
  label: string;
  type: CustomQuestionType;
  options: string[];
  required: boolean;
}

export interface EmbedSettings {
  inlineHeight: number;
  popupButtonText: string;
  buttonText: string;
  buttonBackground: string;
  buttonTextColor: string;
  buttonRadius: number;
  /** Hostnames allowed to embed the form. Empty = any site. */
  allowedDomains: string[];
}

export interface RegistrationSettings {
  pageTitle: string;
  headline: string;
  description: string;
  coverImageUrl: string;
  buttonText: string;
  accentColor: string;
  showDateTime: boolean;
  showPresenters: boolean;
  showVideoPreview: boolean;
  phoneField: "hidden" | "optional" | "required";
  customQuestions: CustomQuestion[];
  /** null = unlimited */
  capacity: number | null;
  embed: EmbedSettings;
}

export interface EmailMessageSettings {
  enabled: boolean;
  subject: string;
  body: string;
}

export interface ReminderSettings extends EmailMessageSettings {
  id: string;
  /** Minutes before the session starts */
  minutesBefore: number;
}

export interface FollowUpSettings extends EmailMessageSettings {
  id: string;
  /** Minutes after the session ends */
  minutesAfter: number;
}

export interface NotificationsSettings {
  confirmation: EmailMessageSettings;
  reminders: ReminderSettings[];
  host: {
    newRegistration: boolean;
    readiness: boolean;
    recipientEmail: string;
  };
  thankYouEmail: EmailMessageSettings & { minutesAfter: number };
  replayEmail: EmailMessageSettings;
  followUps: FollowUpSettings[];
}

export interface IntegrationsSettings {
  video: {
    provider: VideoProviderValue;
    url: string;
    autoplay: boolean;
    muted: boolean;
    showControls: boolean;
  };
  payment: {
    enabled: boolean;
    price: number;
    currency: "NGN" | "USD" | "EUR" | "GBP";
  };
  analytics: {
    googleAnalyticsId: string;
    metaPixelId: string;
  };
  webhook: {
    enabled: boolean;
    url: string;
    /** Generated server-side; visible only to the webinar owner. */
    secret: string;
  };
}

export interface ThankYouSettings {
  headline: string;
  message: string;
  joinInstructions: string;
  showWebinarDetails: boolean;
  addToCalendar: boolean;
  socialSharing: boolean;
  redirectUrl: string;
  redirectDelaySeconds: number;
}

export type RoomAccess = "registered" | "anyone_with_link";

export interface LiveSettings {
  access: RoomAccess;
  entryOpensMinutesBefore: number;
  allowLateJoin: boolean;
  lateJoinCutoffMinutes: number;
  showPresenters: boolean;
  showDescription: boolean;
  chatEnabled: boolean;
  qaEnabled: boolean;
  cta: {
    enabled: boolean;
    label: string;
    url: string;
    showAfterMinutes: number;
  };
}

export type ReplayAccess = "all_registrants" | "attended_only" | "paid_only" | "anyone_with_link";

export interface ReplaySettings {
  enabled: boolean;
  useLiveVideo: boolean;
  video: { provider: VideoProviderValue; url: string };
  title: string;
  description: string;
  access: ReplayAccess;
  availability: "immediately" | "after_session";
  expiration: "never" | "date" | "days_after";
  expiresOn: string;
  expiresAfterDays: number;
}

export interface WebinarWorkflowConfig {
  /** Public, non-guessable identifier used by embeds. Never the internal id. */
  publicId: string;
  version: number;
  /** Config version at which each section was last changed (conflict detection). */
  sectionVersions?: Partial<Record<WorkflowDataSectionKey, number>>;
  publishedAt?: string;
  configuration: ConfigurationSettings;
  schedules: SchedulesSettings;
  registration: RegistrationSettings;
  notifications: NotificationsSettings;
  integrations: IntegrationsSettings;
  thankYou: ThankYouSettings;
  live: LiveSettings;
  replay: ReplaySettings;
  /** Idempotency keys for notifications already sent by the scheduler. */
  sentNotificationKeys?: string[];
}

export type WorkflowSectionData = Pick<WebinarWorkflowConfig, WorkflowDataSectionKey>;

export type SectionState = "completed" | "incomplete" | "attention";

export interface WorkflowIssue {
  section: WorkflowSectionKey;
  severity: "error" | "warning";
  message: string;
  /** Optional field key for focusing */
  field?: string;
}

export interface SectionEvaluation {
  state: SectionState;
  issues: WorkflowIssue[];
  /** Section is required for publishing */
  required: boolean;
}

export interface WorkflowEvaluation {
  sections: Record<WorkflowSectionKey, SectionEvaluation>;
  canPublish: boolean;
  blockingIssues: WorkflowIssue[];
}

export type RegistrationSource = "hosted" | "inline" | "popup" | "button" | "direct";

export interface RegistrationAnalyticsSummary {
  pageViews: number;
  submissions: number;
  successfulRegistrations: number;
  conversionRate: number | null;
  bySource: Record<RegistrationSource, { views: number; registrations: number }>;
}
