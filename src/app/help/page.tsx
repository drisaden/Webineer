import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DocSearch } from "@/components/support/doc-search";
import { HelpContact } from "@/components/support/help-contact";
import { HELP_CATEGORIES, articlesIn } from "@/lib/support/articles";

export default function HelpCenterPage() {
  return (
    <div className="space-y-12">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Help center</p>
        <h1 className="mt-3 text-3xl md:text-4xl">How can we help?</h1>
        <p className="mt-3 text-secondaryText">Step-by-step guides for creating webinars, running the live room, emails, plans and your account.</p>
        <div className="mt-6 text-left"><DocSearch autoFocus={false} /></div>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {HELP_CATEGORIES.map((c) => (
          <section key={c.id} className="rounded-[1.75rem] border border-border bg-white p-5 shadow-soft" aria-labelledby={`cat-${c.id}`}>
            <h2 id={`cat-${c.id}`} className="text-lg text-primaryText">{c.title}</h2>
            <p className="mt-1 text-sm text-secondaryText">{c.blurb}</p>
            <ul className="mt-3">
              {articlesIn(c.id).map((a) => (
                <li key={a.slug}>
                  <Link href={`/help/${a.slug}`} className="group flex min-h-11 items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm text-primaryText hover:bg-[#F7F9FC]">
                    <span>{a.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-secondaryText transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <HelpContact />
    </div>
  );
}
