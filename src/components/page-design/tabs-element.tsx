"use client";

import { useState } from "react";
import type { PageBlockItem, PageTheme } from "@/types";
import { cn } from "@/lib/utils";

/** Tab strip with one panel at a time. Plain text only. */
export function TabsElement({ items, theme }: { items: PageBlockItem[]; theme: PageTheme }) {
  const [active, setActive] = useState(0);
  const current = items[Math.min(active, items.length - 1)];
  return (
    <div className="text-left">
      <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2">
        {items.map((item, i) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn("min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-medium transition", i === active ? "" : "tint-soft opacity-80 hover:opacity-100")}
            style={i === active ? { background: theme.accent, color: theme.accentText } : undefined}
          >
            {item.title || `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-3 whitespace-pre-line text-base opacity-85">{current?.text}</div>
    </div>
  );
}
