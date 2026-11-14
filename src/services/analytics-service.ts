import type { AnalyticsEvent, AnalyticsEventType, AnalyticsSummary, RegistrationAnalyticsSummary, RegistrationSource } from "@/types";
import { mockAnalytics, mockRegistrations, mockWebinars } from "@/data/mock/webinars";
import { getPaymentTransactions } from "@/providers/payment";

const seedEvents: AnalyticsEvent[] = [
  {
    id: "evt_001",
    workspaceId: "ws_001",
    webinarId: "wb_001",
    eventType: "landing_page_viewed",
    timestamp: "2026-11-08T11:45:00Z",
    deviceCategory: "desktop",
    source: "google",
  },
  {
    id: "evt_002",
    workspaceId: "ws_001",
    webinarId: "wb_001",
    eventType: "registration_completed",
    timestamp: "2026-11-08T12:00:00Z",
    deviceCategory: "desktop",
    source: "landing-page",
  },
  {
    id: "evt_003",
    workspaceId: "ws_001",
    webinarId: "wb_001",
    eventType: "webinar_room_entered",
    timestamp: "2026-11-08T17:58:00Z",
    deviceCategory: "desktop",
  },
  {
    id: "evt_004",
    workspaceId: "ws_001",
    webinarId: "wb_001",
    eventType: "cta_clicked",
    timestamp: "2026-11-08T18:45:00Z",
    metadata: { ctaLabel: "Claim Cohort Pass Now" },
  },
  {
    id: "evt_005",
    workspaceId: "ws_001",
    webinarId: "wb_002",
    eventType: "landing_page_viewed",
    timestamp: "2026-11-09T14:10:00Z",
    deviceCategory: "mobile",
    source: "twitter",
  },
];

// Shared across the server process (route handlers + server components).
const analyticsGlobal = globalThis as typeof globalThis & { __webineerAnalyticsEvents?: AnalyticsEvent[] };
const inMemoryEvents: AnalyticsEvent[] = (analyticsGlobal.__webineerAnalyticsEvents ??= [...seedEvents]);

const REGISTRATION_SOURCES: RegistrationSource[] = ["hosted", "inline", "popup", "button", "direct"];

export interface MetricAttribution {
  name: string;
  value: string | number;
  type: "directly_measured" | "calculated" | "estimated" | "unavailable";
  notes: string;
}

export class AnalyticsService {
  recordEvent(event: Omit<AnalyticsEvent, "id">): AnalyticsEvent {
    const record: AnalyticsEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    inMemoryEvents.unshift(record);
    return record;
  }

  listEvents(webinarId: string, types?: AnalyticsEventType[]): AnalyticsEvent[] {
    return inMemoryEvents.filter((e) => e.webinarId === webinarId && (!types || types.includes(e.eventType)));
  }

  /**
   * Registration funnel for one webinar, measured from events recorded by the
   * shared registration backend. Every publishing method reports into the same
   * event stream with its `source`, so there is one attendee database.
   */
  getRegistrationFunnel(webinarId: string): RegistrationAnalyticsSummary {
    const events = this.listEvents(webinarId, ["landing_page_viewed", "registration_started", "registration_completed"]);
    const bySource = Object.fromEntries(
      REGISTRATION_SOURCES.map((s) => [s, { views: 0, registrations: 0 }]),
    ) as RegistrationAnalyticsSummary["bySource"];
    let pageViews = 0;
    let submissions = 0;
    let successfulRegistrations = 0;
    for (const event of events) {
      const source = (REGISTRATION_SOURCES as string[]).includes(event.source ?? "") ? (event.source as RegistrationSource) : "direct";
      if (event.eventType === "landing_page_viewed") {
        pageViews += 1;
        bySource[source].views += 1;
      } else if (event.eventType === "registration_started") {
        submissions += 1;
      } else if (event.eventType === "registration_completed") {
        successfulRegistrations += 1;
        bySource[source].registrations += 1;
      }
    }
    return {
      pageViews,
      submissions,
      successfulRegistrations,
      conversionRate: pageViews > 0 ? Math.round((successfulRegistrations / pageViews) * 1000) / 10 : null,
      bySource,
    };
  }

  getSummary(dateRange: "7d" | "30d" | "90d" | "year" = "30d"): AnalyticsSummary {
    const transactions = getPaymentTransactions().filter((t) => t.status === "completed");
    const totalRev = transactions.reduce((acc, curr) => acc + curr.amount, 0);

    const multiplier = dateRange === "7d" ? 0.35 : dateRange === "30d" ? 1.0 : dateRange === "90d" ? 2.4 : 5.8;

    return {
      totalWebinars: mockWebinars.length,
      publishedWebinars: mockWebinars.filter((w) => w.status !== "draft").length,
      totalRegistrations: Math.round(mockAnalytics.totalRegistrations * multiplier),
      totalAttendees: Math.round(mockAnalytics.totalAttendees * multiplier),
      averageAttendanceRate: mockAnalytics.averageAttendanceRate,
      conversionRate: mockAnalytics.conversionRate,
      revenue: Math.round(totalRev * multiplier),
      currency: "NGN",
      ctaClicks: Math.round(mockAnalytics.ctaClicks * multiplier),
      replayViews: Math.round(mockAnalytics.replayViews * multiplier),
    };
  }

  getHonestAttributionReport(): MetricAttribution[] {
    return [
      {
        name: "Page Views & Form Submissions",
        value: "Accurate (Directly Measured)",
        type: "directly_measured",
        notes: "Directly tracked via native Webineer registration page events.",
      },
      {
        name: "Paid Ticket Transactions",
        value: "Accurate (Directly Measured)",
        type: "directly_measured",
        notes: "Verified server-side via Paystack/Flutterwave transaction references.",
      },
      {
        name: "Webinar Room Attendance",
        value: "Calculated from in-room presence",
        type: "calculated",
        notes: "Tracks users who connected to Webineer attendee room.",
      },
      {
        name: "External Video Concurrent Viewers",
        value: "Estimated / Dependent on Provider",
        type: "estimated",
        notes: "Standard YouTube/Vimeo iframes do not share raw third-party viewer data.",
      },
      {
        name: "Individual Watch Duration (Generic Iframe)",
        value: "Unavailable without custom API player",
        type: "unavailable",
        notes: "Standard sandboxed iframes block external parent DOM inspection.",
      },
    ];
  }

  exportToCSV(type: "registrations" | "transactions" | "webinars"): string {
    if (type === "registrations") {
      const headers = ["ID", "Name", "Email", "Company", "Webinar ID", "Status", "Payment Status", "Registered At"];
      const rows = mockRegistrations.map((r) => [
        r.id,
        `"${r.name}"`,
        r.email,
        `"${r.company || ""}"`,
        r.webinarId,
        r.status,
        r.paymentStatus || "free",
        r.registeredAt,
      ]);
      return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    }

    if (type === "transactions") {
      const headers = ["ID", "Webinar ID", "Attendee Name", "Email", "Amount", "Currency", "Provider", "Status", "Reference", "Created At"];
      const txs = getPaymentTransactions();
      const rows = txs.map((t) => [
        t.id,
        t.webinarId,
        `"${t.attendeeName}"`,
        t.attendeeEmail,
        t.amount,
        t.currency,
        t.provider,
        t.status,
        t.reference,
        t.createdAt,
      ]);
      return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    }

    if (type === "webinars") {
      const headers = ["ID", "Title", "Type", "Status", "Provider", "Registrations", "Attendees", "Starts At"];
      const rows = mockWebinars.map((w) => [
        w.id,
        `"${w.title}"`,
        w.type,
        w.status,
        w.videoSource.provider,
        w.registrationCount,
        w.attendeeCount,
        w.schedule.startsAt,
      ]);
      return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    }

    return "";
  }
}

export const analyticsService = new AnalyticsService();
