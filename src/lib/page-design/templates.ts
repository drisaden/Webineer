import type { PageBlock, PageBlockStyle, PageTheme } from "@/types";
import { ADVANCED_BLOCK_TYPES, DEFAULT_THEME, PAGE_TEMPLATES as CORE_TEMPLATES, blockId, createBlock, type PageTemplate } from "./defaults";
import { flattenBlocks } from "./schema";

/* ── small helpers so each template reads as a short recipe ── */

const theme = (background: string, text: string, accent: string, accentText: string, extra: Partial<PageTheme> = {}): PageTheme => ({ background, text, accent, accentText, headingFont: "brand", maxWidth: "lg", ...extra });
const style = (background: string, textColor: string, extra: Partial<PageBlockStyle> = {}): PageBlockStyle => ({ background, textColor, align: "left", padding: "md", width: "normal", radius: 24, shadow: false, ...extra });
const item = (title: string, text: string, extra: object = {}) => ({ id: blockId("i"), title, text, ...extra });
const cols = (...columns: PageBlock[][]): PageBlock => ({ ...createBlock("columns"), columns: columns.map((blocks) => ({ id: blockId("c"), blocks })) });

const T: PageTemplate[] = [
  {
    id: "form-only",
    name: "Form only",
    kind: "form",
    category: "Any webinar",
    description: "Just the sign-up form on a clean page. Fastest to publish.",
    build: () => ({
      layout: "stacked",
      theme: theme("#F7F9FC", "#172033", "#16D6B2", "#101B35", { maxWidth: "md" }),
      blocks: [createBlock("form", { heading: "Reserve your seat", text: "", style: style("#FFFFFF", "", { shadow: true, padding: "lg", radius: 28 }) })],
    }),
  },
  {
    id: "form-hero",
    name: "Headline + form",
    kind: "form",
    category: "Any webinar",
    description: "A short headline with the sign-up form right under it.",
    build: () => ({
      layout: "stacked",
      theme: theme("#FFFFFF", "#172033", "#16D6B2", "#101B35", { maxWidth: "md" }),
      blocks: [createBlock("hero", { buttonLabel: "", style: style("", "", { align: "center", padding: "md", radius: 0 }) }), createBlock("form", { style: style("#F7F9FC", "", { padding: "lg", radius: 28 }) })],
    }),
  },
  {
    id: "minimal",
    name: "Minimal",
    kind: "standard",
    category: "Any webinar",
    description: "Lots of white space, one message, one button.",
    build: () => ({
      layout: "stacked",
      theme: theme("#FFFFFF", "#111827", "#111827", "#FFFFFF", { headingFont: "sans", maxWidth: "md" }),
      blocks: [
        createBlock("heading", { heading: "A short, clear promise", text: "Say who this is for and what changes after they attend.", style: style("", "", { align: "center", padding: "lg", radius: 0 }) }),
        createBlock("countdown", { style: style("", "", { align: "center", radius: 0 }) }),
        createBlock("benefits", { style: style("", "", { radius: 0 }) }),
        createBlock("form", { style: style("#F3F4F6", "", { radius: 20, padding: "lg" }) }),
      ],
    }),
  },
  {
    id: "course-launch",
    name: "Course launch",
    kind: "long",
    category: "Education",
    description: "Free class that leads into a paid course: numbers, agenda, tickets and FAQ.",
    build: () => ({
      layout: "stacked",
      theme: theme("#F5F3FF", "#1E1B4B", "#7C3AED", "#FFFFFF", { maxWidth: "lg" }),
      blocks: [
        createBlock("hero", { style: style("#FFFFFF", "", { align: "center", padding: "lg", shadow: true, radius: 32 }) }),
        createBlock("countdown", { style: style("#EDE9FE", "", { align: "center" }) }),
        createBlock("stats", { style: style("#FFFFFF", "", { shadow: true }) }),
        createBlock("iconbox", { heading: "What you'll walk away with", style: style("", "", { padding: "sm", radius: 0 }) }),
        createBlock("timeline", { style: style("#FFFFFF", "", { shadow: true }) }),
        createBlock("presenters", { style: style("#FFFFFF", "", { shadow: true }) }),
        createBlock("pricing", { style: style("", "", { padding: "sm", radius: 0 }) }),
        createBlock("testimonials", { style: style("#FFFFFF", "", { shadow: true }) }),
        createBlock("faq", { style: style("#FFFFFF", "", { shadow: true }) }),
        createBlock("form", { style: style("#FFFFFF", "", { shadow: true, padding: "lg" }) }),
      ],
    }),
  },
  {
    id: "conference",
    name: "Summit / conference",
    kind: "long",
    category: "Events",
    description: "Multi-section event page with speakers, agenda, sponsors and a venue.",
    build: () => ({
      layout: "stacked",
      theme: theme("#0B1430", "#FFFFFF", "#0AEBCB", "#041B5E", { maxWidth: "xl" }),
      blocks: [
        createBlock("hero", { style: style("#101B35", "#FFFFFF", { align: "center", padding: "lg", radius: 32 }) }),
        createBlock("countdown", { style: style("#101B35", "#FFFFFF", { align: "center" }) }),
        createBlock("stats", { style: style("#101B35", "#FFFFFF") }),
        createBlock("presenters", { style: style("#101B35", "#FFFFFF") }),
        createBlock("timeline", { style: style("#101B35", "#FFFFFF") }),
        createBlock("logos", { heading: "Supported by", style: style("#101B35", "#FFFFFF", { align: "center" }) }),
        createBlock("map", { style: style("#101B35", "#FFFFFF") }),
        createBlock("faq", { style: style("#101B35", "#FFFFFF") }),
        createBlock("form", { style: style("#FFFFFF", "#172033", { padding: "lg" }) }),
      ],
    }),
  },
  {
    id: "coaching",
    name: "Coach / personal brand",
    kind: "standard",
    category: "Coaching",
    description: "Warm, personal page with a story on one side and the form on the other.",
    build: () => ({
      layout: "stacked",
      theme: theme("#FFF8F1", "#3B2A20", "#E76F51", "#FFFFFF", { headingFont: "serif", maxWidth: "lg" }),
      blocks: [
        createBlock("heading", { heading: "Build a business that fits your life", text: "A free live workshop with practical steps you can use this week.", style: style("", "", { align: "center", padding: "md", radius: 0 }) }),
        cols(
          [createBlock("media", { heading: "Hi, I'm your host", text: "Tell your story in two or three sentences. Why you do this work and who you help.", style: style("#FFFFFF", "", { shadow: true }), buttonLabel: "" }), createBlock("benefits", { style: style("#FFFFFF", "", { shadow: true }) })],
          [createBlock("form", { style: style("#FFFFFF", "", { shadow: true, padding: "lg" }) })],
        ),
        createBlock("testimonials", { style: style("#FFFFFF", "", { shadow: true }) }),
        createBlock("social", { style: style("", "", { align: "center", padding: "sm", radius: 0 }) }),
      ],
    }),
  },
  {
    id: "saas-demo",
    name: "Product demo (SaaS)",
    kind: "long",
    category: "Technology",
    description: "Show what your product does, with tabs, a gallery and a clear next step.",
    build: () => ({
      layout: "sidebar",
      theme: theme("#0F172A", "#E2E8F0", "#38BDF8", "#0B1220", { headingFont: "sans", maxWidth: "xl" }),
      blocks: [
        createBlock("hero", { buttonLabel: "", style: style("#1E293B", "#F8FAFC", { padding: "lg", radius: 28 }) }),
        createBlock("video", { style: style("#1E293B", "#F8FAFC", { padding: "sm" }) }),
        createBlock("tabs", { style: style("#1E293B", "#F8FAFC") }),
        createBlock("iconbox", { style: style("", "", { padding: "sm", radius: 0 }) }),
        createBlock("logos", { heading: "Trusted by teams at", style: style("", "", { padding: "sm", radius: 0 }) }),
        createBlock("faq", { style: style("#1E293B", "#F8FAFC") }),
        createBlock("form", { style: style("#FFFFFF", "#172033", { padding: "lg" }) }),
      ],
    }),
  },
  {
    id: "finance",
    name: "Finance / investing",
    kind: "standard",
    category: "Finance",
    description: "Trust-first design: numbers up top, clear agenda, plain disclaimer-friendly layout.",
    build: () => ({
      layout: "sidebar",
      theme: theme("#F8FAFC", "#0F2A43", "#B8860B", "#FFFFFF", { headingFont: "serif" }),
      blocks: [
        createBlock("hero", { buttonLabel: "", style: style("#0F2A43", "#FFFFFF", { padding: "lg", radius: 20 }) }),
        createBlock("stats", { style: style("#FFFFFF", "", { shadow: true }) }),
        createBlock("timeline", { style: style("#FFFFFF", "", { shadow: true }) }),
        createBlock("presenters", { style: style("#FFFFFF", "", { shadow: true }) }),
        createBlock("text", { heading: "Please note", text: "This session is for education only and is not personal financial advice.", style: style("#EEF2F7", "", { radius: 16 }) }),
        createBlock("form", { style: style("#FFFFFF", "", { shadow: true, padding: "lg", radius: 20 }) }),
      ],
    }),
  },
  {
    id: "wellness",
    name: "Health & wellness",
    kind: "standard",
    category: "Health",
    description: "Soft greens and rounded cards for fitness, nutrition and mindfulness sessions.",
    build: () => ({
      layout: "sidebar",
      theme: theme("#F0FDF4", "#14352A", "#16A34A", "#FFFFFF", { headingFont: "sans" }),
      blocks: [
        createBlock("hero", { buttonLabel: "", style: style("#FFFFFF", "", { padding: "lg", shadow: true, radius: 36 }) }),
        createBlock("iconbox", { style: style("", "", { padding: "sm", radius: 0 }) }),
        createBlock("benefits", { style: style("#FFFFFF", "", { shadow: true, radius: 36 }) }),
        createBlock("presenters", { style: style("#FFFFFF", "", { shadow: true, radius: 36 }) }),
        createBlock("form", { style: style("#FFFFFF", "", { shadow: true, padding: "lg", radius: 36 }) }),
      ],
    }),
  },
  {
    id: "community",
    name: "Church / community",
    kind: "standard",
    category: "Community",
    description: "Friendly gathering page with the time, a location and how to join.",
    build: () => ({
      layout: "stacked",
      theme: theme("#FDF6EC", "#3A2A1A", "#C2410C", "#FFFFFF", { headingFont: "serif", maxWidth: "md" }),
      blocks: [
        createBlock("hero", { buttonLabel: "", style: style("#FFFFFF", "", { align: "center", padding: "lg", shadow: true }) }),
        createBlock("timeline", { heading: "Order of the day", style: style("#FFFFFF", "", { shadow: true }) }),
        createBlock("map", { heading: "Join us in person", style: style("#FFFFFF", "", { shadow: true }) }),
        createBlock("form", { style: style("#FFFFFF", "", { shadow: true, padding: "lg" }) }),
      ],
    }),
  },
  {
    id: "fundraiser",
    name: "Fundraiser / charity",
    kind: "standard",
    category: "Non-profit",
    description: "Tell the story, show the impact and make it easy to take part.",
    build: () => ({
      layout: "stacked",
      theme: theme("#FFFFFF", "#1F2937", "#DC2626", "#FFFFFF", { maxWidth: "md" }),
      blocks: [
        createBlock("hero", { style: style("", "", { align: "center", padding: "lg", radius: 0 }) }),
        createBlock("text", { heading: "Why it matters", text: "Explain the problem and what this event will change.", style: style("#FEF2F2", "") }),
        createBlock("benefits", { heading: "How your support helps", style: style("", "", { radius: 0, padding: "sm" }) }),
        createBlock("button", { buttonLabel: "Join the event", style: style("", "", { align: "center", padding: "sm", radius: 0 }) }),
        createBlock("form", { style: style("#FEF2F2", "", { padding: "lg" }) }),
      ],
    }),
  },
  {
    id: "seasonal-sale",
    name: "Seasonal offer",
    kind: "standard",
    category: "Promotions",
    description: "Urgent, high-contrast page for Black Friday, year-end and limited offers.",
    build: () => ({
      layout: "stacked",
      theme: theme("#111111", "#FFFFFF", "#FACC15", "#111111", { headingFont: "sans" }),
      blocks: [
        createBlock("hero", { style: style("#1C1C1C", "#FFFFFF", { align: "center", padding: "lg", radius: 28 }) }),
        createBlock("countdown", { heading: "Doors close in", style: style("#FACC15", "#111111", { align: "center", radius: 28 }) }),
        createBlock("benefits", { style: style("#1C1C1C", "#FFFFFF") }),
        createBlock("cta", { style: style("#DC2626", "#FFFFFF", { align: "center", padding: "lg", radius: 28 }), buttonLabel: "Save my seat" }),
        createBlock("form", { style: style("#FFFFFF", "#111111", { padding: "lg", radius: 28 }) }),
      ],
    }),
  },
  {
    id: "corporate",
    name: "Corporate training",
    kind: "standard",
    category: "Business",
    description: "Clean, professional layout for internal training and B2B webinars.",
    build: () => ({
      layout: "sidebar",
      theme: theme("#F1F5F9", "#0F172A", "#2563EB", "#FFFFFF", { headingFont: "sans", maxWidth: "xl" }),
      blocks: [
        createBlock("hero", { buttonLabel: "", style: style("#FFFFFF", "", { padding: "lg", shadow: true, radius: 16 }) }),
        createBlock("timeline", { style: style("#FFFFFF", "", { shadow: true, radius: 16 }) }),
        createBlock("benefits", { style: style("#FFFFFF", "", { shadow: true, radius: 16 }) }),
        createBlock("presenters", { style: style("#FFFFFF", "", { shadow: true, radius: 16 }) }),
        createBlock("form", { style: style("#FFFFFF", "", { shadow: true, padding: "lg", radius: 16 }) }),
      ],
    }),
  },
];

const BASIC_CORE = CORE_TEMPLATES.map((t) => ({ ...t, kind: (t.id === "longform" ? "long" : "standard") as PageTemplate["kind"], category: "Any webinar" }));

export const ALL_TEMPLATES: PageTemplate[] = [...BASIC_CORE, ...T];

/** True when the template uses elements that need a paid plan. */
export function templateNeedsPaidPlan(template: PageTemplate): boolean {
  return flattenBlocks(template.build().blocks).some((b) => ADVANCED_BLOCK_TYPES.includes(b.type));
}

export { DEFAULT_THEME };
