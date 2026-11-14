import type { CustomQuestion, Webinar } from "@/types";
import { nextEvergreenSession, primarySessionWindow, registrationWindow } from "./sync";
import { formatInZone, resolveSessions } from "./time";
import { GA_ID_RE, META_PIXEL_RE } from "./validation";
import { buildPlayerUrl } from "./video";

/**
 * The only webinar data sent to public pages and embeds. Built server-side
 * from the stored configuration; it deliberately excludes internal ids,
 * webhook secrets, host emails, notification settings and payment config
 * beyond the displayed price.
 */
export interface PublicRegistrationView {
  publicId: string;
  slug: string;
  title: string;
  description: string;
  headline: string;
  pageTitle: string;
  coverImageUrl: string;
  buttonText: string;
  accentColor: string;
  hostName: string;
  presenters: { name: string; title: string; bio: string; avatarUrl: string }[];
  showPresenters: boolean;
  showDateTime: boolean;
  dateLabel: string;
  timezone: string;
  mode: "right_now" | "schedule_later" | "always_on";
  sessions: { id: string; label: string }[];
  phoneField: "hidden" | "optional" | "required";
  customQuestions: CustomQuestion[];
  videoPlayerUrl: string | null;
  price: { amount: number; currency: string; testMode: boolean } | null;
  closedReason: string | null;
  tracking: { googleAnalyticsId: string | null; metaPixelId: string | null };
  thankYou: {
    headline: string;
    message: string;
    joinInstructions: string;
    showWebinarDetails: boolean;
    addToCalendar: boolean;
    socialSharing: boolean;
    redirectUrl: string;
    redirectDelaySeconds: number;
  };
  calendar: { startsAt: string; endsAt: string };
}

export function buildPublicView(
  webinar: Webinar,
  options: { activeRegistrations: number; paymentTestMode: boolean; now?: Date },
): PublicRegistrationView {
  const config = webinar.workflow!;
  const now = options.now ?? new Date();
  const tz = config.schedules.timezone;
  const mode = config.configuration.mode ?? "schedule_later";
  const durationMs = config.schedules.durationMinutes * 60_000;

  const upcoming =
    mode === "schedule_later"
      ? resolveSessions(config.schedules).filter((s) => s.status === "open" && new Date(s.startsAt) > now)
      : [];

  let dateLabel: string;
  let calendarStart: Date;
  if (mode === "schedule_later") {
    calendarStart = upcoming[0] ? new Date(upcoming[0].startsAt) : primarySessionWindow(webinar, now).startsAt;
    dateLabel = upcoming[0] ? formatInZone(upcoming[0].startsAt, tz) : "No upcoming sessions";
    if (upcoming.length > 1) dateLabel += ` · ${upcoming.length} sessions available`;
  } else if (mode === "always_on") {
    const next = nextEvergreenSession(config, now) ?? now;
    calendarStart = next;
    dateLabel = config.schedules.evergreen.type === "instant" ? "Watch instantly after registering" : `Next session: ${formatInZone(next, tz)}`;
  } else {
    calendarStart = new Date(config.publishedAt ?? now.toISOString());
    dateLabel = webinar.status === "draft" ? "Starts as soon as it's published" : "Happening now";
  }

  const window = registrationWindow(webinar, now);
  let closedReason = window.open ? null : window.reason ?? "Registration is closed.";
  if (!closedReason && config.registration.capacity !== null && options.activeRegistrations >= config.registration.capacity) {
    closedReason = "This webinar is full.";
  }

  const r = config.registration;
  const c = config.configuration;
  const t = config.thankYou;
  const paid = config.integrations.payment.enabled && config.integrations.payment.price > 0;

  return {
    publicId: config.publicId,
    slug: webinar.slug ?? webinar.id,
    title: webinar.title,
    description: r.description || c.description,
    headline: r.headline || c.title,
    pageTitle: r.pageTitle || c.title,
    coverImageUrl: /^https:\/\//.test(r.coverImageUrl || c.coverImageUrl) ? r.coverImageUrl || c.coverImageUrl : "",
    buttonText: r.buttonText || "Register",
    accentColor: /^#[0-9a-fA-F]{6}$/.test(r.accentColor) ? r.accentColor : "#16D6B2",
    hostName: c.hostName,
    presenters: c.presenters
      .filter((p) => p.name.trim())
      .map((p) => ({ name: p.name, title: p.title, bio: p.bio, avatarUrl: /^https:\/\//.test(p.avatarUrl) ? p.avatarUrl : "" })),
    showPresenters: r.showPresenters,
    showDateTime: r.showDateTime,
    dateLabel,
    timezone: tz,
    mode,
    sessions: upcoming.map((s) => ({ id: s.id, label: formatInZone(s.startsAt, tz) })),
    phoneField: r.phoneField,
    customQuestions: r.customQuestions.filter((q) => q.label.trim()),
    videoPlayerUrl: r.showVideoPreview ? buildPlayerUrl(config.integrations.video.provider, config.integrations.video.url) : null,
    price: paid ? { amount: config.integrations.payment.price, currency: config.integrations.payment.currency, testMode: options.paymentTestMode } : null,
    closedReason,
    tracking: {
      googleAnalyticsId: GA_ID_RE.test(config.integrations.analytics.googleAnalyticsId) ? config.integrations.analytics.googleAnalyticsId : null,
      metaPixelId: META_PIXEL_RE.test(config.integrations.analytics.metaPixelId) ? config.integrations.analytics.metaPixelId : null,
    },
    thankYou: {
      headline: t.headline,
      message: t.message,
      joinInstructions: t.joinInstructions,
      showWebinarDetails: t.showWebinarDetails,
      addToCalendar: t.addToCalendar,
      socialSharing: t.socialSharing,
      redirectUrl: /^https:\/\//.test(t.redirectUrl) ? t.redirectUrl : "",
      redirectDelaySeconds: t.redirectDelaySeconds,
    },
    calendar: { startsAt: calendarStart.toISOString(), endsAt: new Date(calendarStart.getTime() + durationMs).toISOString() },
  };
}
