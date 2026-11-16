import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

export const metadata: Metadata = {
  title: { default: "Help center | Webineer", template: "%s | Webineer help" },
  description: "Guides for creating webinars, running the live room, emails, plans and your account, plus ways to contact the Webineer team.",
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-transparent">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(10,235,203,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(4,27,94,0.12),transparent_30%)]" />
      <MarketingNav />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">{children}</main>
      <MarketingFooter />
    </div>
  );
}
