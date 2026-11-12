export type WebinarStatus = "draft" | "scheduled" | "live" | "completed" | "paused";

export type WebinarType = "live" | "automated" | "evergreen" | "on_demand" | "recurring";

export type VideoProviderValue =
  | "youtube"
  | "vimeo"
  | "wistia"
  | "custom_iframe"
  | "custom_url"
  | "uploaded_video"
  | "external_live_stream";

export type LandingPageSectionType =
  | "hero"
  | "features"
  | "video"
  | "cta"
  | "faq"
  | "form"
  | "testimonials"
  | "speakers"
  | "schedule"
  | "pricing"
  | "custom";

export type EmbedType =
  | "url"
  | "iframe"
  | "html"
  | "widget"
  | "video"
  | "image"
  | "audio"
  | "form"
  | "calendar"
  | "custom";

export type WorkspaceRole = "owner" | "admin" | "editor" | "host" | "analyst";

export interface User {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  title: string;
  avatarUrl?: string;
  workspaceId: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
  status: "active" | "invited" | "suspended";
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invitedBy: string;
  expiresAt: string;
  status: "pending" | "accepted" | "expired" | "revoked";
}

export interface WorkspaceBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  footerText?: string;
  hidePoweredBy?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "professional" | "business";
  timezone: string;
  currency: "NGN" | "USD" | "EUR" | "GBP";
  branding?: WorkspaceBranding;
  customDomain?: string;
}

// ==========================================
// Webinar Scheduling & Delivery Models
// ==========================================

export type EvergreenScheduleType = "instant" | "next_interval" | "daily_slots" | "recurring_days";

export interface EvergreenConfig {
  type: EvergreenScheduleType;
  intervalMinutes?: number; // e.g. every 15 mins
  dailySlots?: string[]; // e.g. ["10:00", "14:00", "18:00"]
  allowedDays?: number[]; // 0 = Sun, 1 = Mon, etc.
  allowInstantWatch?: boolean;
}

export interface RecurringScheduleConfig {
  frequency: "daily" | "weekly" | "monthly";
  interval: number; // e.g. every 1 week
  daysOfWeek?: number[]; // e.g. [1, 3, 5] for Mon, Wed, Fri
  timeOfDay: string; // "18:00"
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
}

export interface AutomatedWebinarSettings {
  allowLateJoin: boolean;
  lateJoinCutoffMinutes: number;
  entryOpenMinutesBefore: number;
  enableReplay: boolean;
  replayExpiryDays?: number;
  redirectUrlAfterFinish?: string;
  showLiveBadge: boolean; // Must clearly designate pre-recorded when false
  isPreRecorded: boolean;
}

export interface WebinarSchedule {
  id: string;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  recurrence?: string;
  evergreenConfig?: EvergreenConfig;
  recurringConfig?: RecurringScheduleConfig;
  sessionSlots?: string[]; // Pre-computed upcoming available slots for registration
}

export interface VideoSource {
  id: string;
  provider: VideoProviderValue;
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  embedCode?: string;
  isEmbedded: boolean;
  durationSeconds?: number;
}

export interface VideoProvider {
  id: VideoProviderValue;
  label: string;
  description: string;
  supportsEmbed: boolean;
  supportsUpload: boolean;
  supportsCustomHtml: boolean;
  canExtractId: boolean;
  validationPattern?: string;
  embedHint?: string;
  playerCapabilities: string[];
}

export interface EmbedConfiguration {
  type: EmbedType;
  url?: string;
  iframeSrc?: string;
  html?: string;
  sandbox?: string[];
  allowFullscreen?: boolean;
  responsive?: boolean;
  title?: string;
}

export interface LandingPageSection {
  id: string;
  type: LandingPageSectionType;
  title?: string;
  subtitle?: string;
  content?: string;
  embed?: EmbedConfiguration;
  order: number;
  settings?: Record<string, unknown>;
}

export interface LandingPage {
  id: string;
  webinarId: string;
  slug: string;
  title: string;
  description: string;
  status: "draft" | "published" | "archived";
  sections: LandingPageSection[];
}

// ==========================================
// Monetization & Tickets
// ==========================================

export interface TicketType {
  id: string;
  webinarId: string;
  name: string;
  description?: string;
  price: number; // 0 for free
  currency: "NGN" | "USD" | "EUR" | "GBP";
  capacity?: number;
  soldCount: number;
  isDefault: boolean;
  closesAt?: string;
}

export interface DiscountCode {
  id: string;
  webinarId?: string; // Optional: can be workspace-wide if omitted
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  enabled: boolean;
}

export interface PaymentTransaction {
  id: string;
  workspaceId: string;
  webinarId: string;
  ticketTypeId: string;
  attendeeEmail: string;
  attendeeName: string;
  amount: number;
  currency: string;
  provider: "paystack" | "flutterwave" | "simulated";
  status: "pending" | "completed" | "failed" | "refunded";
  reference: string;
  idempotencyKey: string;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
  metadata?: Record<string, unknown>;
}

// ==========================================
// Time-Based Webinar Interactions
// ==========================================

export type TimelineEventType = "announcement" | "poll" | "offer" | "cta" | "question";

export interface TimelineEvent {
  id: string;
  webinarId: string;
  timeOffsetSec: number; // Seconds from start of video/session
  type: TimelineEventType;
  title: string;
  durationSec: number; // How long it stays visible
  content: string;
  ctaLabel?: string;
  ctaUrl?: string;
  pollOptions?: string[];
  targetAudience?: "all" | "registered" | "vip";
  enabled: boolean;
}

// ==========================================
// Webinar Entity
// ==========================================

export interface Webinar {
  id: string;
  slug?: string;
  title: string;
  description: string;
  status: WebinarStatus;
  type: WebinarType;
  workspaceId: string;
  ownerId: string;
  videoSource: VideoSource;
  schedule: WebinarSchedule;
  automatedSettings?: AutomatedWebinarSettings;
  tickets?: TicketType[];
  timelineEvents?: TimelineEvent[];
  registrationUrl?: string;
  attendeeCount: number;
  registrationCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Registrations & Attendees
// ==========================================

export interface Registration {
  id: string;
  webinarId: string;
  name: string;
  email: string;
  company?: string;
  ticketTypeId?: string;
  ticketName?: string;
  paymentStatus?: "free" | "pending" | "paid" | "refunded";
  transactionId?: string;
  selectedSessionSlot?: string;
  registeredAt: string;
  source: string;
  status: "registered" | "attended" | "converted" | "cancelled";
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface Attendee {
  id: string;
  webinarId: string;
  registrationId?: string;
  name: string;
  email: string;
  joinedAt?: string;
  leftAt?: string;
  watchDurationSeconds?: number;
  attendanceRate?: number;
  completed?: boolean;
  ctaClicked?: boolean;
}

// ==========================================
// Email & Notifications
// ==========================================

export type EmailTemplateType =
  | "registration_confirmation"
  | "reminder_24h"
  | "reminder_1h"
  | "reminder_15m"
  | "starting_now"
  | "missed_webinar"
  | "replay_available"
  | "thank_you"
  | "post_webinar_followup"
  | "purchase_confirmation"
  | "cancellation_rescheduling";

export interface EmailTemplate {
  id: string;
  workspaceId: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[]; // e.g. ["first_name", "webinar_title", "webinar_date", "webinar_link"]
  isSystemDefault: boolean;
  updatedAt: string;
}

export interface ReminderSequenceItem {
  id: string;
  webinarId: string;
  templateType: EmailTemplateType;
  timingOffsetMinutes: number; // e.g. -1440 for 24h before, 0 for start, 120 for 2h after
  enabled: boolean;
  subjectOverride?: string;
}

export interface EmailDeliveryRecord {
  id: string;
  workspaceId: string;
  webinarId?: string;
  recipientEmail: string;
  recipientName: string;
  templateType: EmailTemplateType;
  subject: string;
  provider: "development_log" | "smtp" | "resend";
  status: "queued" | "sent_to_provider" | "delivered" | "simulated" | "failed" | "bounced";
  errorMessage?: string;
  timestamp: string;
  simulated: boolean;
}

export interface EmailCampaign {
  id: string;
  workspaceId: string;
  name: string;
  webinarId?: string;
  type: "reminder" | "newsletter" | "attendance" | "followup";
  audienceSegment: string;
  scheduledFor?: string;
  sentAt?: string;
  status: "draft" | "scheduled" | "sent" | "cancelled";
  recipientCount: number;
  openRate?: number;
  clickRate?: number;
}

// ==========================================
// Automation Engine
// ==========================================

export type AutomationTriggerEvent =
  | "webinar_created"
  | "webinar_published"
  | "registration_completed"
  | "registration_cancelled"
  | "webinar_starting"
  | "webinar_ended"
  | "attendee_entered_room"
  | "attendee_left_room"
  | "attendee_reached_video_position"
  | "cta_clicked"
  | "poll_submitted"
  | "attendee_marked_attended"
  | "replay_available"
  | "ticket_purchased";

export type AutomationActionType =
  | "send_email"
  | "schedule_email"
  | "add_tag"
  | "remove_tag"
  | "update_registration_status"
  | "send_webhook"
  | "record_analytics_event"
  | "reveal_cta"
  | "notify_host";

export interface AutomationCondition {
  field: "registration_status" | "webinar_type" | "tags" | "attendance_status" | "ticket_type";
  operator: "equals" | "not_equals" | "contains" | "in";
  value: string | string[];
}

export interface AutomationStep {
  id: string;
  type: "action" | "condition" | "delay";
  actionType?: AutomationActionType;
  actionPayload?: Record<string, unknown>;
  condition?: AutomationCondition;
  delayMinutes?: number;
  nextStepId?: string;
}

export interface AutomationWorkflow {
  id: string;
  workspaceId: string;
  webinarId?: string; // Optional: applies to specific webinar or all
  name: string;
  description: string;
  trigger: AutomationTriggerEvent;
  steps: AutomationStep[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  executionCount: number;
}

export interface AutomationExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  triggerEvent: AutomationTriggerEvent;
  targetId: string; // attendee or registration or webinar id
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  idempotencyKey: string;
  startedAt: string;
  completedAt?: string;
  logs: string[];
  error?: string;
}

// ==========================================
// Analytics & Reporting
// ==========================================

export type AnalyticsEventType =
  | "landing_page_viewed"
  | "registration_started"
  | "registration_completed"
  | "registration_cancelled"
  | "webinar_room_entered"
  | "webinar_room_exited"
  | "video_started"
  | "video_paused"
  | "video_progress"
  | "cta_viewed"
  | "cta_clicked"
  | "poll_opened"
  | "poll_submitted"
  | "question_submitted"
  | "payment_initiated"
  | "payment_completed"
  | "replay_viewed";

export interface AnalyticsEvent {
  id: string;
  workspaceId: string;
  webinarId: string;
  eventType: AnalyticsEventType;
  userId?: string;
  anonymousId?: string;
  timestamp: string;
  deviceCategory?: "desktop" | "mobile" | "tablet";
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsSummary {
  totalWebinars: number;
  publishedWebinars: number;
  totalRegistrations: number;
  totalAttendees: number;
  averageAttendanceRate: number;
  conversionRate: number;
  revenue: number;
  currency: string;
  ctaClicks: number;
  replayViews: number;
}

// ==========================================
// Custom Domains & Integrations
// ==========================================

export interface CustomDomain {
  id: string;
  workspaceId: string;
  domain: string;
  subdomain?: string;
  isPrimary: boolean;
  status: "pending" | "verified" | "failed";
  sslStatus: "pending" | "active" | "error";
  verificationToken: string;
  cnameTarget: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface WebhookEndpoint {
  id: string;
  workspaceId: string;
  url: string;
  name: string;
  subscribedEvents: AutomationTriggerEvent[];
  secretKey: string;
  enabled: boolean;
  createdAt: string;
  lastDeliveryStatus?: "success" | "failed";
  lastDeliveryAt?: string;
}

export interface WebhookDeliveryLog {
  id: string;
  endpointId: string;
  event: AutomationTriggerEvent;
  payload: Record<string, unknown>;
  statusCode?: number;
  status: "delivered" | "failed" | "retrying";
  attempt: number;
  timestamp: string;
  durationMs?: number;
  responseBody?: string;
}

export interface IntegrationConnector {
  id: string;
  category: "video" | "email" | "payments" | "calendar" | "analytics" | "webhooks";
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  statusText: string;
  isAvailable: boolean;
  config?: Record<string, unknown>;
}

// ==========================================
// Audience Segmentation & Contacts
// ==========================================

export interface ContactRecord {
  id: string;
  workspaceId: string;
  email: string;
  name: string;
  company?: string;
  tags: string[];
  totalRegistrations: number;
  totalAttended: number;
  totalSpent: number;
  currency: string;
  lastActivityAt: string;
  consentGiven: boolean;
  unsubscribed: boolean;
}

export interface AudienceSegment {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  criteria: {
    attendedMin?: number;
    purchasedTickets?: boolean;
    hasTags?: string[];
    registeredForWebinarId?: string;
  };
  contactCount: number;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  actorName: string;
  actorEmail: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress?: string;
}
