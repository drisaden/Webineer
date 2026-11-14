"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Check,
  ClipboardList,
  Flag,
  PartyPopper,
  Plug,
  Radio,
  RotateCcw,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_SECTIONS } from "@/lib/webinar-workflow/defaults";
import type { SectionState, WorkflowSectionKey } from "@/types";

export const SECTION_ICONS: Record<WorkflowSectionKey, LucideIcon> = {
  configuration: Settings2,
  schedules: CalendarClock,
  registration: ClipboardList,
  notifications: Bell,
  integrations: Plug,
  thankYou: PartyPopper,
  live: Radio,
  replay: RotateCcw,
  finish: Flag,
};

const STATE_LABEL: Record<SectionState, string> = {
  completed: "Completed",
  incomplete: "Incomplete",
  attention: "Attention required",
};

export function WorkflowTimeline({
  active,
  states,
  onSelect,
}: {
  active: WorkflowSectionKey;
  states: Record<WorkflowSectionKey, SectionState>;
  onSelect: (key: WorkflowSectionKey) => void;
}) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const completedCount = WORKFLOW_SECTIONS.filter((s) => s.key !== "finish" && states[s.key] === "completed").length;

  // Keep the active step visible inside the horizontally scrollable strip on mobile.
  useEffect(() => {
    itemRefs.current[active]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = Math.min(WORKFLOW_SECTIONS.length - 1, index + 1);
    else if (event.key === "ArrowLeft") next = Math.max(0, index - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = WORKFLOW_SECTIONS.length - 1;
    else return;
    event.preventDefault();
    itemRefs.current[WORKFLOW_SECTIONS[next].key]?.focus();
  };

  return (
    <nav aria-label="Webinar setup sections" className="min-w-0 rounded-[1.5rem] border border-white/60 bg-white/80 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl md:p-4">
      <div className="mb-2 flex items-center justify-between px-1 text-xs text-secondaryText">
        <span className="font-medium uppercase tracking-[0.12em]">Setup progress</span>
        <span aria-live="polite">
          {completedCount} of {WORKFLOW_SECTIONS.length - 1} sections complete
        </span>
      </div>
      <ol className="-mx-1 flex snap-x snap-mandatory gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] lg:grid lg:grid-cols-9 lg:overflow-visible">
        {WORKFLOW_SECTIONS.map((section, index) => {
          const Icon = SECTION_ICONS[section.key];
          const state = states[section.key];
          const isActive = section.key === active;
          return (
            <li key={section.key} className="relative min-w-[6.75rem] snap-start lg:min-w-0">
              {index > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-[1.4rem] hidden h-0.5 w-1/2 -translate-x-0 lg:block",
                    states[WORKFLOW_SECTIONS[index - 1].key] === "completed" ? "bg-[#16D6B2]" : "bg-[#E4E9F1]",
                  )}
                />
              )}
              {index < WORKFLOW_SECTIONS.length - 1 && (
                <span aria-hidden className={cn("absolute right-0 top-[1.4rem] hidden h-0.5 w-1/2 lg:block", state === "completed" ? "bg-[#16D6B2]" : "bg-[#E4E9F1]")} />
              )}
              <button
                ref={(el) => {
                  itemRefs.current[section.key] = el;
                }}
                type="button"
                onClick={() => onSelect(section.key)}
                onKeyDown={(event) => onKeyDown(event, index)}
                aria-current={isActive ? "step" : undefined}
                aria-label={`${index + 1}. ${section.label} — ${isActive ? "current, " : ""}${STATE_LABEL[state].toLowerCase()}`}
                title={section.description}
                className={cn(
                  "group relative z-10 flex w-full flex-col items-center gap-1.5 rounded-xl px-1.5 py-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0AEBCB]/70",
                  isActive ? "bg-[#EEF5FF]" : "hover:bg-[#F7F9FC]",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white transition-colors",
                    isActive && "border-[#041B5E] text-[#041B5E] shadow-[0_0_0_4px_rgba(4,27,94,0.08)]",
                    !isActive && state === "completed" && "border-[#16D6B2] bg-[#EAFBF5] text-[#0F7B52]",
                    !isActive && state === "attention" && "border-[#E7A23B] bg-[#FFF8EA] text-[#B87514]",
                    !isActive && state === "incomplete" && "border-[#D6DEEA] text-[#64748B]",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {state === "completed" && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#16D6B2] text-white ring-2 ring-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                  {state === "attention" && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E7A23B] text-white ring-2 ring-white">
                      <AlertTriangle className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                </span>
                <span className={cn("text-xs leading-tight", isActive ? "font-semibold text-[#041B5E]" : "font-medium text-primaryText")}>{section.label}</span>
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    state === "completed" && "text-[#0F7B52]",
                    state === "attention" && "text-[#B87514]",
                    state === "incomplete" && "text-secondaryText",
                  )}
                >
                  {section.key === "finish" && state === "completed" ? "Published" : STATE_LABEL[state]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
