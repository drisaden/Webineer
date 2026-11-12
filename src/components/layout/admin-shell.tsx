"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  CreditCard,
  Database,
  FileText,
  Globe,
  LayoutGrid,
  MessageSquareText,
  ShieldCheck,
  Users,
  Video,
  Wallet,
  Workflow,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutGrid },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Workspaces", href: "/admin/workspaces", icon: Globe },
  { label: "Webinars", href: "/admin/webinars", icon: Video },
  { label: "Registrations", href: "/admin/registrations", icon: FileText },
  { label: "Contacts", href: "/admin/contacts", icon: MessageSquareText },
  { label: "Landing Pages", href: "/admin/landing-pages", icon: FileText },
  { label: "Transactions", href: "/admin/transactions", icon: Wallet },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Integrations", href: "/admin/integrations", icon: Workflow },
  { label: "Email", href: "/admin/email", icon: Bell },
  { label: "Announcements", href: "/admin/announcements", icon: Bell },
  { label: "Automations", href: "/admin/automations", icon: Activity },
  { label: "Background Jobs", href: "/admin/jobs", icon: Wrench },
  { label: "System Health", href: "/admin/system", icon: ShieldCheck },
  { label: "Administrators", href: "/admin/administrators", icon: ShieldCheck },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: Activity },
  { label: "Platform Settings", href: "/admin/settings", icon: Wrench },
  { label: "Database Status", href: "/admin/database", icon: Database },
  { label: "Maintenance", href: "/admin/maintenance", icon: Wrench },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#F7F9FC] text-[#172033]">
      <aside className="hidden w-72 flex-col border-r border-border bg-[#101B35] p-5 text-white lg:flex">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16D6B2] text-lg font-bold text-[#101B35]">W</div>
          <div>
            <div className="text-lg font-semibold">Webineer Admin</div>
            <div className="text-xs text-white/60">Platform control</div>
          </div>
        </div>

        <nav className="space-y-1 overflow-y-auto pr-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <div className="mb-2 flex items-center gap-2 font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-[#16D6B2]" />
            Admin mode
          </div>
          <p>Demo-only panel for platform operations and mock data. Sensitive actions are logged for audit.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-white/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondaryText">Platform operations</div>
              <div className="mt-1 text-lg font-semibold text-primaryText">Super Admin Panel</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-border bg-[#F7F9FC] px-3 py-2 text-sm text-secondaryText">Search users, workflows, transactions</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#101B35] text-sm font-medium text-white">AO</div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-secondaryText">Admin</p>
              <h1 className="mt-1 text-2xl font-semibold text-primaryText">Platform Control</h1>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#17294B]">
              Customer app <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
