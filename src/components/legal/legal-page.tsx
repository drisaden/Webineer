import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

/** Shared shell for the public legal pages (terms, privacy, copyright). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <MarketingNav />
      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight text-primaryText">{title}</h1>
        <p className="mt-2 text-sm text-secondaryText">Last updated {updated}</p>
        <div className="mt-8 space-y-6 text-[15px] leading-7 text-secondaryText [&_a]:font-medium [&_a]:text-[#17294B] [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-primaryText [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
