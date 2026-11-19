"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BarChart3, Bell, CreditCard, FileText, HelpCircle, PartyPopper, Rocket, Users, Video, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  /** `data-tour` value of the element to spotlight; omit for a centred card. */
  target?: string;
  icon: typeof Video;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  { icon: Rocket, title: "Welcome to your workspace", body: "This one-minute tour shows where everything lives. You can skip it now and replay it later from Help & Support." },
  { target: "nav-webinars", icon: Video, title: "Webinars", body: "Create a webinar here. A guided setup walks you through the schedule, registration page, emails and the room, then you publish." },
  { target: "nav-landing-pages", icon: FileText, title: "Landing pages", body: "Design each webinar's registration page with drag-and-drop blocks, your own images and colours." },
  { target: "nav-registrants", icon: Users, title: "Registrants", body: "Everyone who signs up appears here with the session they picked and how they found you." },
  { target: "nav-automations", icon: Wand2, title: "Automations", body: "Confirmation emails, reminders and follow-ups are scheduled for each registrant automatically." },
  { target: "nav-emails", icon: Bell, title: "Emails", body: "See every email that was sent, delivered or is waiting to be retried." },
  { target: "nav-analytics", icon: BarChart3, title: "Analytics", body: "Track registrations and attendance across your webinars." },
  { target: "nav-billing", icon: CreditCard, title: "Billing", body: "Your plan, its limits and upgrades. Paid plans are prepaid for 30 days." },
  { target: "nav-help", icon: HelpCircle, title: "Help & Support", body: "Come back here any time to replay this tour." },
  { icon: PartyPopper, title: "You're ready", body: "Start by creating your first webinar. It takes a few minutes and you can save it as a draft at any point." },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;

// Phones and narrow windows get a bottom sheet instead of a floating card.
const NARROW_QUERY = "(max-width: 639px)";
const subscribeNarrow = (notify: () => void) => {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const readNarrow = () => window.matchMedia(NARROW_QUERY).matches;

function visibleRect(target: string | undefined): Rect | null {
  if (!target) return null;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth) {
      return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
    }
  }
  return null;
}

/**
 * Animated first-run guide. Spotlights the main navigation one item at a time; where an item isn't
 * on screen (the mobile menu is closed) the step is shown as a centred card instead.
 */
export function OnboardingTour({ persist }: { persist: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const narrow = useSyncExternalStore(subscribeNarrow, readNarrow, () => false);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  const finish = useCallback(
    (goCreate: boolean) => {
      setOpen(false);
      // keepalive: the request must survive an immediate navigation or reload.
      if (persist) void fetch("/api/onboarding/tour", { method: "POST", keepalive: true }).catch(() => undefined);
      if (goCreate) router.push("/dashboard/webinars/new");
      else if (window.location.search.includes("tour=1")) router.replace(window.location.pathname);
    },
    [persist, router],
  );

  // Find and follow the current target (it can move when the page scrolls or resizes).
  useLayoutEffect(() => {
    if (!open) return;
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const measure = () => setRect(visibleRect(step.target));
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step.target]);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
      else if (event.key === "ArrowRight") setIndex((i) => Math.min(i + 1, STEPS.length - 1));
      else if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open) return null;

  // Card position: beside the spotlight when there is one and room for it, otherwise centred.
  // On a phone it's a bottom sheet that never covers the highlighted item's tap target unexpectedly.
  const cardWidth = 340;
  const beside = !narrow && rect && typeof window !== "undefined" && rect.left + rect.width + 16 + cardWidth < window.innerWidth;
  const cardStyle: React.CSSProperties = narrow
    ? {}
    : beside
      ? { top: Math.max(16, Math.min(rect!.top, window.innerHeight - 300)), left: rect!.left + rect!.width + 16, width: cardWidth }
      : { top: "50%", left: "50%", width: `min(${cardWidth + 40}px, calc(100vw - 2rem))`, transform: "translate(-50%, -50%)" };
  // The sidebar is hidden on phones, so nav steps point at the menu button instead of a highlight.
  const menuHint = narrow && step.target && !rect;
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[60]" data-testid="onboarding-tour" aria-live="polite">
      {/* Click-blocker so the page underneath can't be used mid-tour. */}
      <div className="absolute inset-0" onClick={(event) => event.stopPropagation()} />
      {/* Spotlight: one element whose huge shadow dims everything else, so it can glide between targets. */}
      <div
        aria-hidden
        className="tour-spotlight pointer-events-none absolute rounded-2xl"
        style={
          rect
            ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height, opacity: 1 }
            : { top: "50%", left: "50%", width: 0, height: 0, opacity: 1 }
        }
      >
        {rect && <span className="tour-pulse absolute inset-0 rounded-2xl" />}
      </div>

      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        key={index}
        className={`tour-card absolute border border-white/70 bg-white shadow-[0_24px_60px_rgba(4,27,94,0.35)] outline-none ${narrow ? "inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-[1.25rem] p-4" : "rounded-[1.5rem] p-5"}`}
        style={cardStyle}
      >
        <button type="button" onClick={() => finish(false)} aria-label="Skip tour" className="tap-icon absolute right-1.5 top-1.5 rounded-full p-1.5 text-secondaryText hover:bg-[#EEF5FF] md:right-3 md:top-3">
          <X className="h-4 w-4" />
        </button>
        <span className="tour-icon inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAFBF5] text-[#0F7B52]">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-secondaryText">
          Step {index + 1} of {STEPS.length}
        </p>
        <h2 id="tour-title" className="mt-1 text-lg text-primaryText">{step.title}</h2>
        <p className="mt-2 text-sm text-secondaryText">{step.body}</p>
        {menuHint && (
          <p className="mt-2 rounded-xl bg-[#EEF5FF] px-3 py-2 text-xs text-[#041B5E]">On a phone, tap the menu button (☰) at the top left to find this.</p>
        )}

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#EEF2F7]" aria-hidden>
          <div className="h-full rounded-full bg-[#16D6B2] transition-[width] duration-500 ease-out" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
          <button type="button" onClick={() => finish(false)} className="tap -ml-2 px-2 text-sm font-medium text-secondaryText hover:text-primaryText">
            {last ? "Close" : "Skip tour"}
          </button>
          <div className={`flex items-center gap-2 ${narrow && last ? "w-full flex-col-reverse items-stretch" : ""}`}>
            {index > 0 && (
              <Button type="button" variant="secondary" size="sm" className="min-h-11 border-border" onClick={() => setIndex(index - 1)}>
                <ArrowLeft className="mr-1 h-4 w-4" aria-hidden /> Back
              </Button>
            )}
            {last ? (
              <Button type="button" size="sm" className="min-h-11" onClick={() => finish(true)}>
                Create a webinar <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button type="button" size="sm" className="min-h-11" onClick={() => setIndex(index + 1)}>
                Next <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
