"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Building2, CreditCard, Palette, ShieldCheck, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listTimeZones } from "@/lib/webinar-workflow/time";
import type { SettingsData } from "@/server/settings";

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

const ROLE_OPTIONS = ["OWNER", "ADMIN", "EDITOR", "HOST", "ANALYST"] as const;

function useSave() {
  const router = useRouter();
  const [state, setState] = useState<{ status: "idle" | "saving" | "saved" | "error"; message?: string }>({ status: "idle" });
  const save = async (url: string, body: unknown) => {
    setState({ status: "saving" });
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setState({ status: "error", message: data.error ?? "Saving failed. Please try again." });
      return false;
    }
    setState({ status: "saved", message: "Saved." });
    router.refresh();
    return true;
  };
  return { state, save };
}

function SaveStatus({ state }: { state: ReturnType<typeof useSave>["state"] }) {
  if (state.status === "idle") return null;
  return (
    <span role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-[#B33A3A]" : "text-secondaryText"}`}>
      {state.status === "saving" ? "Saving…" : state.message}
    </span>
  );
}

export function SettingsView({ data }: { data: SettingsData }) {
  const [activeTab, setActiveTab] = useState("profile");
  const demo = data.mode === "demo";
  const profileSave = useSave();
  const orgSave = useSave();
  const memberSave = useSave();
  const [profile, setProfile] = useState({ name: data.profile.name, title: data.profile.title });
  const [org, setOrg] = useState({ name: data.organization.name, timezone: data.organization.timezone });

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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void profileSave.save("/api/account/profile", profile);
              }}
            >
              <h2 className="text-xl font-semibold">Profile</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="profile-name" className="mb-2 block text-sm font-medium">Full name</label>
                  <input id="profile-name" className="input-field" value={profile.name} maxLength={120} disabled={demo} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="profile-title" className="mb-2 block text-sm font-medium">Role</label>
                  <input id="profile-title" className="input-field" value={profile.title} maxLength={120} disabled={demo} onChange={(e) => setProfile((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="profile-email" className="mb-2 block text-sm font-medium">Email</label>
                  <input id="profile-email" className="input-field" value={data.profile.email} readOnly disabled />
                  <p className="mt-1.5 text-xs text-secondaryText">Your sign-in email. Contact support to change it.</p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <SaveStatus state={profileSave.state} />
                <Button type="submit" disabled={demo || profileSave.state.status === "saving"}>Save changes</Button>
              </div>
              {demo && <p className="mt-3 text-xs text-secondaryText">Profile editing is disabled in demo mode.</p>}
            </form>
          )}

          {activeTab === "workspace" && (
            <div className="space-y-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void orgSave.save("/api/organization", org);
                }}
              >
                <h2 className="text-xl font-semibold">Workspace</h2>
                <div className="mt-6 space-y-5">
                  <div>
                    <label htmlFor="org-name" className="mb-2 block text-sm font-medium">Workspace name</label>
                    <input id="org-name" className="input-field" value={org.name} maxLength={80} disabled={!data.canManageSettings} onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))} />
                  </div>
                  <div>
                    <label htmlFor="org-timezone" className="mb-2 block text-sm font-medium">Time zone</label>
                    <select id="org-timezone" className="input-field" value={org.timezone} disabled={!data.canManageSettings} onChange={(e) => setOrg((o) => ({ ...o, timezone: e.target.value }))}>
                      {listTimeZones(org.timezone).map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                    <p className="mt-1.5 text-xs text-secondaryText">Default for new webinars.</p>
                  </div>
                </div>
                {data.canManageSettings ? (
                  <div className="mt-6 flex items-center justify-end gap-3">
                    <SaveStatus state={orgSave.state} />
                    <Button type="submit" disabled={orgSave.state.status === "saving"}>Save workspace</Button>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-secondaryText">{demo ? "Workspace settings are read-only in demo mode." : "Only workspace owners and admins can change these settings."}</p>
                )}
              </form>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Members</h3>
                  <SaveStatus state={memberSave.state} />
                </div>
                <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
                  {data.members.map((m) => (
                    <li key={m.userId} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primaryText">{m.name}{m.isSelf && <span className="ml-2 text-xs text-secondaryText">(you)</span>}</p>
                        <p className="truncate text-xs text-secondaryText">{m.email}{m.status !== "ACTIVE" && ` · ${m.status.toLowerCase()}`}</p>
                      </div>
                      {data.canManageMembers && !m.isSelf ? (
                        <select
                          aria-label={`Role for ${m.name}`}
                          className="input-field w-auto py-1.5 text-sm"
                          defaultValue={m.role}
                          onChange={(e) => void memberSave.save(`/api/organization/members/${m.userId}`, { role: e.target.value })}
                        >
                          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs font-medium uppercase tracking-[0.1em] text-secondaryText">{m.role.toLowerCase()}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-secondaryText">Email invitations are enabled once outgoing email (SMTP) is configured.</p>
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
                {demo ? (
                  <p>Demo mode: sign-in is simulated for local development and is not production security.</p>
                ) : (
                  <>
                    <p>You sign in with your email and password through Supabase Auth. Sessions are stored in secure, HTTP-only cookies.</p>
                    <p>
                      To change your password, <a href="/forgot-password" className="font-medium text-[#17294B] underline">request a reset link</a>.
                    </p>
                  </>
                )}
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
