import { mockAnalytics, mockWebinars } from "@/data/mock/webinars";
import { mockActivities } from "@/data/mock/activities";
import { mockUser } from "@/data/mock/users";
import { getCurrentUser } from "@/lib/auth/demo-session";
import { formatInZone } from "@/lib/webinar-workflow/time";
import { getStore } from "@/server/repositories";

export interface DashboardOverviewData {
  demo: boolean;
  viewer: { name: string; subtitle: string };
  stats: { totalWebinars: number; totalRegistrations: number; totalAttendees: number; attendanceRate: number | null };
  chartData: { name: string; registrations: number; attendees: number }[];
  activities: { id: string; title: string; time: string }[];
  upcoming: { id: string; title: string; slug?: string; status: string; registrationCount: number; startsLabel: string }[];
}

const DEMO_CHART = [
  { name: "Jan", registrations: 120, attendees: 82 },
  { name: "Feb", registrations: 150, attendees: 110 },
  { name: "Mar", registrations: 188, attendees: 126 },
  { name: "Apr", registrations: 210, attendees: 148 },
  { name: "May", registrations: 260, attendees: 182 },
  { name: "Jun", registrations: 330, attendees: 210 },
  { name: "Jul", registrations: 360, attendees: 238 },
];

function relativeTime(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Overview numbers for the active workspace, computed from real records (mock data only in demo mode). */
export async function getDashboardOverview(): Promise<DashboardOverviewData> {
  const store = getStore();
  const user = await getCurrentUser();
  if (store.kind === "mock") {
    return {
      demo: true,
      viewer: { name: mockUser.name, subtitle: `${mockUser.title} · ${mockUser.email}` },
      stats: { totalWebinars: mockAnalytics.totalWebinars, totalRegistrations: mockAnalytics.totalRegistrations, totalAttendees: mockAnalytics.totalAttendees, attendanceRate: mockAnalytics.averageAttendanceRate },
      chartData: DEMO_CHART,
      activities: mockActivities.map((a) => ({ id: a.id, title: a.title, time: a.time })),
      upcoming: mockWebinars.slice(0, 3).map((w) => ({ id: w.id, title: w.title, slug: w.slug, status: w.status, registrationCount: w.registrationCount, startsLabel: new Date(w.schedule.startsAt).toLocaleString() })),
    };
  }
  if (!user) throw new Error("Not signed in.");

  const [webinars, registrations] = await Promise.all([store.listWebinars(user.workspaceId), store.listWorkspaceRegistrations(user.workspaceId, 1000)]);
  const active = registrations.filter((r) => r.status !== "cancelled");
  const attended = active.filter((r) => r.status === "attended" || r.status === "converted");

  const now = new Date();
  const months = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6 + i, 1)));
  const chartData = months.map((start, i) => {
    const end = months[i + 1] ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const inMonth = active.filter((r) => {
      const t = Date.parse(r.registeredAt);
      return t >= start.getTime() && t < end.getTime();
    });
    return {
      name: start.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      registrations: inMonth.length,
      attendees: inMonth.filter((r) => r.status === "attended" || r.status === "converted").length,
    };
  });

  const upcoming = webinars
    .filter((w) => (w.status === "scheduled" || w.status === "live") && Date.parse(w.schedule.endsAt ?? w.schedule.startsAt) >= now.getTime())
    .sort((a, b) => a.schedule.startsAt.localeCompare(b.schedule.startsAt))
    .slice(0, 3)
    .map((w) => ({ id: w.id, title: w.title, slug: w.slug, status: w.status, registrationCount: w.registrationCount, startsLabel: formatInZone(w.schedule.startsAt, w.schedule.timezone) }));

  return {
    demo: false,
    viewer: { name: user.name, subtitle: user.title ? `${user.title} · ${user.email}` : user.email },
    stats: {
      totalWebinars: webinars.length,
      totalRegistrations: active.length,
      totalAttendees: attended.length,
      attendanceRate: active.length ? Math.round((attended.length / active.length) * 1000) / 10 : null,
    },
    chartData,
    activities: registrations.slice(0, 4).map((r) => ({ id: r.id, title: `New registration for ${r.webinarTitle}`, time: relativeTime(r.registeredAt) })),
    upcoming,
  };
}
