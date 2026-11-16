"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { HELP_ARTICLES, searchArticles } from "@/lib/support/articles";

/** Search box over the help articles. Runs in the browser, so results appear as you type. */
export function DocSearch({ limit = 6, autoFocus = false }: { limit?: number; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => (q.trim().length > 1 ? searchArticles(q).slice(0, limit) : []), [q, limit]);
  return (
    <div className="relative">
      <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-white px-4 shadow-sm focus-within:border-[#0AEBCB]">
        <Search className="h-5 w-5 shrink-0 text-secondaryText" aria-hidden />
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search help articles"
          placeholder="Search help articles, for example “reminder emails”"
          className="min-h-11 w-full bg-transparent text-base outline-none"
        />
      </label>
      {q.trim().length > 1 && (
        <ul className="mt-2 overflow-hidden rounded-2xl border border-border bg-white shadow-soft" aria-label="Search results" data-testid="doc-results">
          {results.length === 0 ? (
            <li className="px-4 py-4 text-sm text-secondaryText">No articles match “{q.trim()}”. Try fewer words, or contact support below.</li>
          ) : (
            results.map((a) => (
              <li key={a.slug} className="border-b border-border last:border-0">
                <Link href={`/help/${a.slug}`} className="block px-4 py-3 hover:bg-[#F7F9FC]">
                  <span className="block text-sm font-medium text-primaryText">{a.title}</span>
                  <span className="block text-xs text-secondaryText">{a.summary}</span>
                </Link>
              </li>
            ))
          )}
          {results.length > 0 && HELP_ARTICLES.length > limit && <li className="px-4 py-2 text-xs text-secondaryText">{results.length} result{results.length === 1 ? "" : "s"}</li>}
        </ul>
      )}
    </div>
  );
}
