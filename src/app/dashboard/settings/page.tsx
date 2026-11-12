"use client";

import { useState } from "react";
import { Bell, Building2, CreditCard, Palette, ShieldCheck, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "preferences", label: "Preferences", icon: CreditCard },
];

const quickLinks = [
  { href: "/dashboard/settings/payments", label: "Payments" },
  { href: "/dashboard/settings/domains", label: "Domains" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <DashboardShell title="Settings">
      <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
        <div className="rounded-[2rem] border border-border bg-white p-3 shadow-soft">
          <div className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  activeTab === id ? "bg-[#EAFBF5] text-[#0F7B52]" : "text-secondaryText hover:bg-[#F7F9FC]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {quickLinks.map((link) => (
              <a key={link.href} href={link.href} className="block rounded-xl border border-border px-3 py-2 text-sm font-medium text-secondaryText hover:bg-[#F7F9FC]">
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <Card className="p-6">
          {activeTab === "profile" && (
            <div>
              <h2 className="text-xl font-semibold">Profile</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Full name</label>
                  <input className="input-field" defaultValue="Avery Morgan" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Role</label>
                  <input className="input-field" defaultValue="Product Marketing Lead" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <input className="input-field" defaultValue="avery@northstarstudio.co" />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button>Save changes</Button>
              </div>
            </div>
          )}

          {activeTab === "workspace" && (
            <div>
              <h2 className="text-xl font-semibold">Workspace</h2>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">Workspace name</label>
                  <input className="input-field" defaultValue="Northstar Studio" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Time zone</label>
                  <input className="input-field" defaultValue="America/New_York" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "branding" && (
            <div>
              <h2 className="text-xl font-semibold">Branding</h2>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">Brand colors</label>
                  <div className="flex gap-3">
                    <span className="h-10 w-10 rounded-full bg-[#101B35]" />
                    <span className="h-10 w-10 rounded-full bg-[#17294B]" />
                    <span className="h-10 w-10 rounded-full bg-[#16D6B2]" />
                    <span className="h-10 w-10 rounded-full bg-[#EEF2F7] border border-border" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Workspace logo</label>
                  <div className="rounded-2xl border border-dashed border-border bg-[#F7F9FC] p-6 text-sm text-secondaryText">Drop a PNG/SVG file here or choose from your library.</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div>
              <h2 className="text-xl font-semibold">Notifications</h2>
              <div className="mt-6 grid gap-4">
                {[
                  "Email reminders before live webinars",
                  "Attendance summary emails",
                  "Sales follow-up notifications",
                ].map((label) => (
                  <label key={label} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <span className="text-sm">{label}</span>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div>
              <h2 className="text-xl font-semibold">Security</h2>
              <div className="mt-6 space-y-4 text-sm text-secondaryText">
                <p>Demo authentication is enabled for local development. It is intentionally not production-grade security.</p>
                <p>Use real authentication providers in a production environment and keep access tokens out of the browser.</p>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div>
              <h2 className="text-xl font-semibold">Preferences</h2>
              <div className="mt-6 space-y-4">
                <label className="flex items-center justify-between rounded-xl border border-border p-3">
                  <span className="text-sm">Show demo data labels</span>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-border p-3">
                  <span className="text-sm">Enable compact dashboard layout</span>
                  <input type="checkbox" className="h-4 w-4" />
                </label>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
