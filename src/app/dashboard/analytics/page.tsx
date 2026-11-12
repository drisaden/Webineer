import Link from "next/link";
import { BarChart3, CircleDollarSign, Filter, Globe2, Users } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { analyticsService } from "@/services/analytics-service";

const views = [
  { href: "/dashboard/analytics/webinars", label: "Webinar analytics", icon: BarChart3 },
  { href: "/dashboard/analytics/audience", label: "Audience performance", icon: Users },
  { href: "/dashboard/analytics/revenue", label: "Revenue reporting", icon: CircleDollarSign },
];

export default function AnalyticsPage() {
  const summary = analyticsService.getSummary("30d");

  return (
    <DashboardShell title="Analytics">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-secondaryText">Measured from real registration and payment events in the mock workspace.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge label="Last 30 days" tone="info" />
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard/analytics/webinars">Filter reports</Link>
            </Button>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Total webinars</span><BarChart3 className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{summary.totalWebinars}</p><p className="mt-2 text-xs text-secondaryText">{summary.publishedWebinars} published</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Registrations</span><Users className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{summary.totalRegistrations}</p><p className="mt-2 text-xs text-secondaryText">{summary.conversionRate}% conversion</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Attendees</span><Filter className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{summary.totalAttendees}</p><p className="mt-2 text-xs text-secondaryText">{summary.averageAttendanceRate}% attendance</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Revenue</span><CircleDollarSign className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">₦{summary.revenue.toLocaleString()}</p><p className="mt-2 text-xs text-secondaryText">{summary.currency} tracked</p></Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Report center</h3>
                <Badge label="Directly measured" tone="success" />
              </div>
              {views.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center justify-between rounded-xl border border-border bg-[#F7F9FC] px-3 py-3 text-sm font-medium transition hover:bg-[#EEF2F7]">
                  <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#16D6B2]" /> {label}</span>
                  <span>Open</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Honest metrics</h3>
                <Globe2 className="h-4 w-4 text-[#16D6B2]" />
              </div>
              <ul className="space-y-3 text-sm text-secondaryText">
                <li>• Page views and form submissions are directly tracked.</li>
                <li>• Third-party video concurrency remains provider-dependent.</li>
                <li>• Attendance is calculated from Webineer room entries and recorded events.</li>
                <li>• Unavailable metrics remain explicitly labelled instead of fabricated.</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardShell>
  );
}
