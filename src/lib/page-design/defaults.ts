import type { PageBlock, PageBlockStyle, PageBlockType, PageDesign, PageTheme } from "@/types";

export const MAX_PAGE_BLOCKS = 60;
export const MAX_NESTED_BLOCKS = 6;
/** Top-level blocks plus everything inside columns. */
export const MAX_TOTAL_BLOCKS = 150;
export const MAX_BLOCK_ITEMS = 12;
/** Elements that need a paid plan. The standard blocks and a few basics are always available. */
export const ADVANCED_BLOCK_TYPES: PageBlockType[] = ["iconbox", "pricing", "stats", "timeline", "gallery", "logos", "tabs", "social", "map", "columns"];

let counter = 0;
/** Short unique id for blocks and items (unique within a design is all that's needed). */
export function blockId(prefix = "b"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const DEFAULT_THEME: PageTheme = {
  background: "#F7F9FC",
  text: "#172033",
  accent: "#16D6B2",
  accentText: "#101B35",
  headingFont: "brand",
  maxWidth: "lg",
};

const CARD: PageBlockStyle = { background: "#FFFFFF", textColor: "", align: "left", padding: "md", width: "normal", radius: 28, shadow: true };
const PLAIN: PageBlockStyle = { background: "", textColor: "", align: "left", padding: "sm", width: "normal", radius: 0, shadow: false };

export interface BlockDefinition {
  type: PageBlockType;
  label: string;
  description: string;
  /** Only one of these may exist on a page. */
  single?: boolean;
  /** Which content fields the editor shows for this block. */
  fields: ("heading" | "text" | "image" | "imageSide" | "button" | "link" | "items" | "showDate" | "height" | "columns")[];
  itemLabels?: { title: string; text: string; noun: string };
  /** Extra fields each item has, beyond its title and text. */
  itemFields?: ("image" | "link" | "icon")[];
  advanced?: boolean;
  /** Shown to the owner in the palette, grouped by kind. */
  group: "Basics" | "Content" | "Social proof" | "Layout";
  create: () => Omit<PageBlock, "id" | "type">;
}

const base = (style: PageBlockStyle, extra: Partial<Omit<PageBlock, "id" | "type" | "style">> = {}): Omit<PageBlock, "id" | "type"> => ({
  style: { ...style },
  heading: "",
  text: "",
  imageUrl: "",
  imageAlt: "",
  imageSide: "right",
  buttonLabel: "",
  items: [],
  showDate: false,
  height: 32,
  ...extra,
});

const item = (title: string, text: string) => ({ id: blockId("i"), title, text });

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "hero",
    group: "Basics",
    label: "Hero",
    description: "Headline, intro, date and a register button",
    fields: ["heading", "text", "image", "button", "showDate"],
    create: () => base(CARD, { showDate: true, buttonLabel: "Reserve my seat" }),
  },
  {
    type: "text",
    group: "Basics",
    label: "Text",
    description: "A heading with a paragraph",
    fields: ["heading", "text"],
    create: () => base(CARD, { heading: "What you'll learn", text: "Describe what attendees will take away from this session." }),
  },
  {
    type: "image",
    group: "Basics",
    label: "Image",
    description: "A full-width picture",
    fields: ["image"],
    create: () => base({ ...PLAIN, radius: 24 }),
  },
  {
    type: "media",
    group: "Content",
    label: "Image + text",
    description: "A picture beside a heading and paragraph",
    fields: ["heading", "text", "image", "imageSide", "button"],
    create: () => base(CARD, { heading: "Why this matters", text: "Explain the problem this webinar solves.", imageSide: "right" }),
  },
  {
    type: "video",
    group: "Content",
    label: "Video preview",
    description: "The preview set up in Registration",
    single: true,
    fields: ["heading"],
    create: () => base({ ...CARD, padding: "sm" }),
  },
  {
    type: "countdown",
    group: "Content",
    label: "Countdown",
    description: "Time left until the session starts",
    single: true,
    fields: ["heading"],
    create: () => base({ ...CARD, align: "center" }, { heading: "Starts in" }),
  },
  {
    type: "presenters",
    group: "Content",
    label: "Presenters",
    description: "Your host and presenters",
    single: true,
    fields: ["heading"],
    create: () => base(CARD, { heading: "Presented by" }),
  },
  {
    type: "benefits",
    group: "Content",
    label: "Benefits",
    description: "A list of key points",
    fields: ["heading", "items"],
    itemLabels: { title: "Point", text: "Detail", noun: "point" },
    create: () =>
      base(CARD, {
        heading: "In this session",
        items: [item("A clear framework", "The steps to follow, in order."), item("Real examples", "See how it works in practice."), item("Live Q&A", "Bring your questions.")],
      }),
  },
  {
    type: "testimonials",
    group: "Social proof",
    label: "Testimonials",
    description: "Quotes from past attendees",
    fields: ["heading", "items"],
    itemLabels: { title: "Name", text: "Quote", noun: "testimonial" },
    create: () => base(CARD, { heading: "What attendees say", items: [item("Attendee name", "Add a short quote from someone who attended.")] }),
  },
  {
    type: "faq",
    group: "Content",
    label: "FAQ",
    description: "Questions and answers",
    fields: ["heading", "items"],
    itemLabels: { title: "Question", text: "Answer", noun: "question" },
    create: () =>
      base(CARD, {
        heading: "Questions",
        items: [item("Is there a replay?", "Say whether a recording will be available."), item("How long is it?", "Tell people how much time to set aside.")],
      }),
  },
  {
    type: "cta",
    group: "Basics",
    label: "Call to action",
    description: "A banner with a register button",
    fields: ["heading", "text", "button"],
    create: () => base({ ...CARD, background: "#041B5E", textColor: "#FFFFFF", align: "center", padding: "lg" }, { heading: "Save your seat", text: "Registration takes less than a minute.", buttonLabel: "Register now" }),
  },
  {
    type: "form",
    group: "Basics",
    label: "Registration form",
    description: "The sign-up form (always on the page)",
    single: true,
    fields: ["heading", "text"],
    create: () => base(CARD, { heading: "Reserve your seat" }),
  },
  {
    type: "divider",
    group: "Layout",
    label: "Spacer",
    description: "Empty space between blocks",
    fields: ["height"],
    create: () => base(PLAIN, { height: 32 }),
  },

  {
    type: "heading",
    group: "Basics",
    label: "Heading",
    description: "A large headline with an optional subheading",
    fields: ["heading", "text"],
    create: () => base({ ...PLAIN, align: "center" }, { heading: "Your headline goes here", text: "" }),
  },
  {
    type: "button",
    group: "Basics",
    label: "Button",
    description: "A button that goes to the form or any link",
    fields: ["button", "link"],
    create: () => base({ ...PLAIN, align: "center" }, { buttonLabel: "Register now" }),
  },
  {
    type: "iconbox",
    group: "Content",
    label: "Icon boxes",
    description: "Cards with an icon, title and text",
    advanced: true,
    fields: ["heading", "items"],
    itemFields: ["icon"],
    itemLabels: { title: "Title", text: "Text", noun: "box" },
    create: () => base(PLAIN, { heading: "Why people come", items: [{ ...item("Learn fast", "Practical steps you can use today."), icon: "bolt" as const }, { ...item("Meet experts", "Ask your questions live."), icon: "users" as const }, { ...item("Get resources", "Take away templates and notes."), icon: "gift" as const }] }),
  },
  {
    type: "pricing",
    group: "Content",
    label: "Pricing table",
    description: "Compare ticket options side by side",
    advanced: true,
    fields: ["heading", "button", "items"],
    itemFields: ["link"],
    itemLabels: { title: "Name and price", text: "What's included (one per line)", noun: "option" },
    create: () => base(PLAIN, { heading: "Choose your ticket", buttonLabel: "Get this ticket", items: [item("Standard · Free", "Live access\nChat and Q&A"), item("VIP · ₦10,000", "Live access\nReplay for 30 days\nSlides and notes")] }),
  },
  {
    type: "stats",
    group: "Social proof",
    label: "Numbers",
    description: "Big figures such as attendees or years of experience",
    advanced: true,
    fields: ["heading", "items"],
    itemLabels: { title: "Number", text: "Label", noun: "figure" },
    create: () => base(CARD, { heading: "", items: [item("2,500+", "Attendees"), item("40", "Countries"), item("4.9/5", "Average rating")] }),
  },
  {
    type: "timeline",
    group: "Content",
    label: "Agenda",
    description: "A step-by-step schedule or timeline",
    advanced: true,
    fields: ["heading", "items"],
    itemLabels: { title: "Time or step", text: "What happens", noun: "step" },
    create: () => base(CARD, { heading: "Agenda", items: [item("10 minutes", "Welcome and goals"), item("30 minutes", "The main session"), item("20 minutes", "Live Q&A")] }),
  },
  {
    type: "gallery",
    group: "Content",
    label: "Photo gallery",
    description: "A grid of pictures",
    advanced: true,
    fields: ["heading", "items"],
    itemFields: ["image"],
    itemLabels: { title: "Caption", text: "Alt text", noun: "photo" },
    create: () => base(PLAIN, { heading: "From past sessions", items: [] }),
  },
  {
    type: "logos",
    group: "Social proof",
    label: "Logo strip",
    description: "Brands, partners or places you've been featured",
    advanced: true,
    fields: ["heading", "items"],
    itemFields: ["image", "link"],
    itemLabels: { title: "Name", text: "Alt text", noun: "logo" },
    create: () => base(PLAIN, { heading: "As seen with", items: [] }),
  },
  {
    type: "tabs",
    group: "Content",
    label: "Tabs",
    description: "Content split into tabs",
    advanced: true,
    fields: ["heading", "items"],
    itemLabels: { title: "Tab name", text: "Tab content", noun: "tab" },
    create: () => base(CARD, { heading: "", items: [item("Overview", "Say what the session covers."), item("Who it's for", "Describe the ideal attendee.")] }),
  },
  {
    type: "social",
    group: "Social proof",
    label: "Social links",
    description: "Links to your profiles",
    advanced: true,
    fields: ["heading", "items"],
    itemFields: ["link"],
    itemLabels: { title: "Name", text: "Handle", noun: "link" },
    create: () => base({ ...PLAIN, align: "center" }, { heading: "Follow along", items: [item("Instagram", ""), item("LinkedIn", "")] }),
  },
  {
    type: "map",
    group: "Content",
    label: "Location",
    description: "An address with a link to the map",
    advanced: true,
    fields: ["heading", "text", "link"],
    create: () => base(CARD, { heading: "Where to find us", text: "Street address, city" }),
  },
  {
    type: "columns",
    group: "Layout",
    label: "Columns",
    description: "Place other elements side by side",
    advanced: true,
    fields: ["columns"],
    create: () => ({ ...base({ ...PLAIN, padding: "none" }), columns: [{ id: blockId("c"), blocks: [] }, { id: blockId("c"), blocks: [] }] }),
  },
];

export const BLOCK_BY_TYPE = Object.fromEntries(BLOCK_DEFINITIONS.map((d) => [d.type, d])) as Record<PageBlockType, BlockDefinition>;

export function createBlock(type: PageBlockType, overrides: Partial<Omit<PageBlock, "id" | "type">> = {}): PageBlock {
  const created = BLOCK_BY_TYPE[type].create();
  return { id: blockId(), type, ...created, ...overrides, style: { ...created.style, ...(overrides.style ?? {}) } };
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  /** "form" pages are just the sign-up form; "long" pages tell the whole story; "standard" sit in between. */
  kind?: "form" | "standard" | "long";
  /** Industry or occasion, shown as a filter in the gallery. */
  category?: string;
  build: () => Pick<PageDesign, "layout" | "theme" | "blocks">;
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Content on the left, sticky form on the right.",
    build: () => ({
      layout: "sidebar",
      theme: { ...DEFAULT_THEME },
      blocks: [createBlock("hero", { buttonLabel: "" }), createBlock("video"), createBlock("benefits"), createBlock("presenters"), createBlock("form")],
    }),
  },
  {
    id: "longform",
    name: "Long-form",
    description: "One centred column that tells the whole story.",
    build: () => ({
      layout: "stacked",
      theme: { ...DEFAULT_THEME, background: "#FFFFFF", maxWidth: "md" },
      blocks: [
        createBlock("hero", { style: { ...CARD, background: "", shadow: false, align: "center", padding: "lg" } }),
        createBlock("countdown", { style: { ...CARD, align: "center", background: "#F7F9FC", shadow: false } }),
        createBlock("video"),
        createBlock("benefits"),
        createBlock("presenters"),
        createBlock("testimonials"),
        createBlock("faq"),
        createBlock("form", { style: { ...CARD, background: "#F7F9FC", shadow: false } }),
      ],
    }),
  },
  {
    id: "bold",
    name: "Bold",
    description: "Dark, high-contrast page with a strong call to action.",
    build: () => ({
      layout: "stacked",
      theme: { background: "#0B1430", text: "#FFFFFF", accent: "#0AEBCB", accentText: "#041B5E", headingFont: "brand", maxWidth: "lg" },
      blocks: [
        createBlock("hero", { style: { background: "#101B35", textColor: "#FFFFFF", align: "center", padding: "lg", width: "wide", radius: 32, shadow: true } }),
        createBlock("benefits", { style: { ...CARD, background: "#101B35", textColor: "#FFFFFF" } }),
        createBlock("media", { style: { ...CARD, background: "#101B35", textColor: "#FFFFFF" } }),
        createBlock("presenters", { style: { ...CARD, background: "#101B35", textColor: "#FFFFFF" } }),
        createBlock("form", { style: { ...CARD, background: "#FFFFFF", textColor: "#172033" } }),
        createBlock("cta", { style: { background: "#0AEBCB", textColor: "#041B5E", align: "center", padding: "lg", width: "normal", radius: 28, shadow: false }, buttonLabel: "" }),
      ],
    }),
  },
];

/** Starting point when a webinar has no saved design yet (mirrors the standard layout). */
export function defaultPageDesign(): PageDesign {
  return { enabled: true, ...PAGE_TEMPLATES[0].build() };
}
