"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, BarChart3, Bell, CalendarClock, CreditCard, FileText, HelpCircle, LayoutGrid, MessageSquareText, Plug, Settings, Sparkles, Users, Video, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants/site";

const nav = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "All Webinars", href: "/dashboard/webinars", icon: Video },
  { label: "Upcoming", href: "/dashboard/webinars/upcoming", icon: CalendarClock },
  { label: "Past Webinars", href: "/dashboard/webinars/past", icon: Archive },
  { label: "Automated Webinars", href: "/dashboard/webinars/automated", icon: Sparkles },
  { label: "Automations", href: "/dashboard/automations", icon: Wand2 },
  { label: "Registrants", href: "/dashboard/registrants", icon: Users },
  { label: "Contacts", href: "/dashboard/contacts", icon: MessageSquareText },
  { label: "Landing Pages", href: "/dashboard/landing-pages", icon: FileText },
  { label: "Emails", href: "/dashboard/emails", icon: Bell },
  { label: "Email Campaigns", href: "/dashboard/email-campaigns", icon: Bell },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
];

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className={mobile ? "flex h-full w-full flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(4,27,94,0.96),rgba(7,31,98,0.9))] p-5 text-white shadow-[10px_0_30px_rgba(4,27,94,0.12)] lg:hidden" : "sticky top-0 hidden h-screen w-72 flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(4,27,94,0.96),rgba(7,31,98,0.9))] p-5 text-white shadow-[10px_0_30px_rgba(4,27,94,0.12)] lg:flex"}>
      <div className="mb-8 flex items-center gap-3 px-2">
        <img src="/brand/logo-dark.svg" alt={`${APP_NAME} logo`} className="h-9 w-auto" />
      </div>

      <div className="space-y-6 overflow-y-auto pr-1">
        <div>
          <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">Overview</p>
          <nav className="space-y-1.5">
            {nav.map(({ label, href, icon: Icon }) => {
              const isActive = href === "/dashboard" ? pathname === href : (pathname === href || pathname.startsWith(`${href}/`));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                    isActive ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mt-auto rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Wand2 className="h-4 w-4 text-[#0AEBCB]" />
          Demo workspace
        </div>
        <p className="text-xs text-white/70">Frontend-only authentication and mock data are enabled for local development.</p>
      </div>
    </aside>
  );
}
