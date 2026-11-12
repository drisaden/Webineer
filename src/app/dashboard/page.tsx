"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CalendarClock, ChevronRight, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockAnalytics, mockWebinars } from "@/data/mock/webinars";
import { mockActivities } from "@/data/mock/activities";
import { mockUser } from "@/data/mock/users";

const chartData = [
  { name: "Jan", registrations: 120, attendees: 82 },
  { name: "Feb", registrations: 150, attendees: 110 },
  { name: "Mar", registrations: 188, attendees: 126 },
  { name: "Apr", registrations: 210, attendees: 148 },
  { name: "May", registrations: 260, attendees: 182 },
  { name: "Jun", registrations: 330, attendees: 210 },
  { name: "Jul", registrations: 360, attendees: 238 },
];

export default function DashboardPage() {
  return (
    <DashboardShell title="Dashboard">
      <div className="space-y-6">
        <section className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(4,27,94,0.96),rgba(9,35,86,0.9))] p-6 text-white shadow-[0_22px_50px_rgba(4,27,94,0.18)] md:flex-row md:items-center md:justify-between backdrop-blur-xl">
          <div>
            <p className="text-sm text-white/70">Good evening, welcome back.</p>
            <h2 className="mt-2 text-2xl">{mockUser.name}</h2>
            <p className="mt-1 text-sm text-white/70">{mockUser.title} · {mockUser.email}</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="secondary" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              <Link href="/dashboard/webinars/new">Create Webinar</Link>
            </Button>
            <Button asChild className="bg-[#0AEBCB] text-[#041B5E] hover:bg-[#72F5DF]">
              <Link href="/dashboard/analytics">View Analytics</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Webinars" value={String(mockAnalytics.totalWebinars)} change="12%" tone="info" />
          <StatCard label="Total Registrations" value={String(mockAnalytics.totalRegistrations)} change="18%" tone="success" />
          <StatCard label="Total Attendees" value={String(mockAnalytics.totalAttendees)} change="10%" tone="default" />
          <StatCard label="Average Attendance Rate" value={`${mockAnalytics.averageAttendanceRate}%`} change="8%" tone="info" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <Card className="glass-panel overflow-hidden">
            <div className="border-b border-white/20 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Webinar performance</h3>
                <span className="text-sm text-secondaryText">Last 7 months</span>
              </div>
            </div>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillRegistrations" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#16D6B2" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#16D6B2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E4E9F1" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="registrations" stroke="#16D6B2" fill="url(#fillRegistrations)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="glass-panel p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Quick actions</h3>
                <Sparkles className="h-4 w-4 text-[#16D6B2]" />
              </div>
              <div className="mt-4 space-y-3">
                <Link href="/dashboard/webinars/new" className="flex items-center justify-between rounded-xl border border-border bg-[#F7F9FC] px-3 py-3 text-sm font-medium hover:bg-[#EEF2F7] transition">
                  Create Webinar <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/dashboard/landing-pages" className="flex items-center justify-between rounded-xl border border-border bg-[#F7F9FC] px-3 py-3 text-sm font-medium hover:bg-[#EEF2F7] transition">
                  Browse Landing Pages <ChevronRight className="h-4 w-4" />
                </Link>
                <Link href="/dashboard/analytics" className="flex items-center justify-between rounded-xl border border-border bg-[#F7F9FC] px-3 py-3 text-sm font-medium hover:bg-[#EEF2F7] transition">
                  View Analytics <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>

            <Card className="glass-panel p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Recent activity</h3>
                <Badge label="Live" tone="success" />
              </div>
              <div className="mt-4 space-y-3">
                {mockActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#16D6B2]" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primaryText">{activity.title}</p>
                      <p className="text-xs text-secondaryText">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <Card className="glass-panel overflow-hidden">
            <div className="border-b border-white/20 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Upcoming webinars</h3>
                <Link href="/dashboard/webinars/upcoming" className="text-sm font-medium text-[#17294B] hover:underline">View all</Link>
              </div>
            </div>
            <div className="divide-y divide-border">
              {mockWebinars.slice(0, 3).map((webinar) => (
                <div key={webinar.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h4 className="min-w-0 text-base leading-tight text-primaryText sm:text-lg">{webinar.title}</h4>
                      <Badge label={webinar.status} tone={webinar.status === "scheduled" ? "info" : "success"} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondaryText">
                      <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5 shrink-0" /> {new Date(webinar.schedule.startsAt).toLocaleString()}</span>
                      <span>{webinar.registrationCount} registrations</span>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                      <Link href={`/dashboard/webinars/${webinar.id}`}>Manage</Link>
                    </Button>
                    {webinar.slug && (
                      <Button asChild size="sm" className="w-full sm:w-auto">
                        <Link href={`/w/${webinar.slug}`}>View Public</Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="glass-panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg">Coming soon</h3>
              <Badge label="Demo" tone="warning" />
            </div>
            <div className="mt-4 space-y-3 text-sm text-secondaryText">
              <p>Revenue attribution, custom domains and advanced automation are reserved for Phase 3 of the roadmap.</p>
              <p>These screens are intentionally labeled as demo-only and are not presented as production analytics.</p>
            </div>
          </Card>
        </section>
      </div>
    </DashboardShell>
  );
}
