"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowUpRight, BadgeCheck, BriefcaseBusiness, CreditCard, Gauge, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { adminNotifications, adminOverviewMetrics, monthlyPlatformChart } from "@/data/mock/admin";

const statCards = [
  { label: "Registered users", value: adminOverviewMetrics.totalUsers.toLocaleString(), detail: "+12.4% vs last period", icon: Users },
  { label: "Active workspaces", value: adminOverviewMetrics.activeWorkspaces.toLocaleString(), detail: "+9.8%", icon: BriefcaseBusiness },
  { label: "Platform revenue", value: `NGN ${adminOverviewMetrics.platformRevenue.toLocaleString()}`, detail: `Webinar revenue: NGN ${adminOverviewMetrics.webinarRevenue.toLocaleString()}`, icon: CreditCard },
  { label: "Failed payments", value: String(adminOverviewMetrics.failedPayments), detail: "Monitor and reconcile", icon: AlertTriangle },
];

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondaryText">{label}</span>
              <Icon className="h-4 w-4 text-[#16D6B2]" />
            </div>
            <div className="mt-4 text-3xl font-semibold text-primaryText">{value}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-secondaryText">
              <ArrowUpRight className="h-3.5 w-3.5 text-[#16A36A]" /> {detail}
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Platform growth</h3>
              <Badge label="This year" tone="info" />
            </div>
          </div>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyPlatformChart} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="usersFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#16D6B2" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#16D6B2" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E4E9F1" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" stroke="#16D6B2" fill="url(#usersFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Priority alerts</h3>
            <Badge label="Live" tone="success" />
          </div>
          <div className="mt-4 space-y-3">
            {adminNotifications.map((alert) => (
              <div key={alert.title} className="rounded-xl border border-border bg-[#F7F9FC] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-primaryText">{alert.title}</p>
                  <Badge label={alert.severity} tone={alert.severity === "critical" ? "warning" : "info"} />
                </div>
                <p className="mt-2 text-xs text-secondaryText">{alert.time}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-lg font-semibold">Revenue and jobs</h3>
          </div>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPlatformChart}>
                  <CartesianGrid stroke="#E4E9F1" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#17294B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">System health</h3>
            <BadgeCheck className="h-4 w-4 text-[#16A36A]" />
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-[#F7F9FC] p-3">
              <span className="text-sm text-secondaryText">Email delivery rate</span>
              <span className="text-sm font-semibold text-primaryText">{adminOverviewMetrics.deliveryRate}%</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-[#F7F9FC] p-3">
              <span className="text-sm text-secondaryText">Failed automation jobs</span>
              <span className="text-sm font-semibold text-primaryText">{adminOverviewMetrics.failedAutomationJobs}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-[#F7F9FC] p-3">
              <span className="text-sm text-secondaryText">Platform revenue</span>
              <span className="text-sm font-semibold text-primaryText">NGN {adminOverviewMetrics.platformRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-[#F7F9FC] p-3">
              <span className="text-sm text-secondaryText">Webinar ticket revenue</span>
              <span className="text-sm font-semibold text-primaryText">NGN {adminOverviewMetrics.webinarRevenue.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
