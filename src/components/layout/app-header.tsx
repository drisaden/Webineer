"use client";

import { Bell, HelpCircle, Menu, Moon, Search, SunMedium, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { readThemePreference, subscribeTheme, writeThemePreference } from "@/components/layout/theme-sync";
import { Sidebar } from "@/components/layout/sidebar";
import { AccountMenu } from "@/components/auth/account-menu";

const notifications = [
  { title: "Launch reminder sent", detail: "3 contacts received the event reminder" },
  { title: "Payment confirmed", detail: "Your webinar package renewed successfully" },
  { title: "Automation step queued", detail: "Follow-up email is scheduled for 2:30 PM" },
];

const helpItems = [
  "Create a webinar with your preferred provider",
  "Review registrant engagement in analytics",
  "Publish a branded landing page for your next event",
];

export function AppHeader({ title = "Overview" }: { title?: string }) {
  const dark = useSyncExternalStore(subscribeTheme, readThemePreference, () => false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const toggleTheme = () => writeThemePreference(!dark);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/60 bg-white/75 text-primaryText shadow-[0_10px_20px_rgba(15,23,42,0.03)] lg:hidden"
            aria-label="Open menu"
            onClick={() => setShowMobileMenu((value) => !value)}
          >
            {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            <div className="flex items-center gap-2 rounded-xl border border-white/60 bg-[#F7F9FC]/80 px-3 py-2 text-sm text-secondaryText shadow-[0_10px_20px_rgba(15,23,42,0.03)]">
              <Search className="h-4 w-4" />
              <input aria-label="Search" placeholder="Search webinars, contacts..." className="w-64 bg-transparent text-sm outline-none placeholder:text-secondaryText" />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/60 bg-white/75 text-primaryText shadow-[0_10px_20px_rgba(15,23,42,0.03)]" aria-label="Toggle theme" onClick={toggleTheme}>
              {dark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/60 bg-white/75 text-primaryText shadow-[0_10px_20px_rgba(15,23,42,0.03)]"
              aria-label="Help center"
              onClick={() => {
                setShowHelp((value) => !value);
                setShowNotifications(false);
              }}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/60 bg-white/75 text-primaryText shadow-[0_10px_20px_rgba(15,23,42,0.03)]"
              aria-label="Notifications"
              onClick={() => {
                setShowNotifications((value) => !value);
                setShowHelp(false);
              }}
            >
              <Bell className="h-4 w-4" />
            </button>
            <AccountMenu />
          </div>
        </div>
      </header>

      {showNotifications && (
        <div className="absolute right-4 top-20 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-[1.5rem] border border-white/60 bg-white/80 p-4 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-secondaryText">Notifications</h3>
            <button className="text-xs font-medium text-primaryText" onClick={() => setShowNotifications(false)}>Close</button>
          </div>
          <div className="space-y-3">
            {notifications.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-[#F7F9FC] p-3">
                <p className="text-sm font-medium text-primaryText">{item.title}</p>
                <p className="mt-1 text-xs text-secondaryText">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showHelp && (
        <div className="absolute right-4 top-20 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-[1.5rem] border border-white/60 bg-white/80 p-4 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-secondaryText">Help center</h3>
            <button className="text-xs font-medium text-primaryText" onClick={() => setShowHelp(false)}>Close</button>
          </div>
          <ul className="space-y-2 text-sm text-secondaryText">
            {helpItems.map((item) => (
              <li key={item} className="rounded-xl border border-border bg-[#F7F9FC] px-3 py-2">{item}</li>
            ))}
          </ul>
        </div>
      )}

      {showMobileMenu && (
        <div className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" onClick={() => setShowMobileMenu(false)}>
          <div className="h-full w-[86%] max-w-sm" onClick={(event) => event.stopPropagation()}>
            <Sidebar mobile />
          </div>
        </div>
      )}
    </>
  );
}
