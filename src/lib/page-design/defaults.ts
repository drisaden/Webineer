import type { PageBlock, PageBlockStyle, PageBlockType, PageDesign, PageTheme } from "@/types";

export const MAX_PAGE_BLOCKS = 30;
export const MAX_BLOCK_ITEMS = 12;

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
  fields: ("heading" | "text" | "image" | "imageSide" | "button" | "items" | "showDate" | "height")[];
  itemLabels?: { title: string; text: string; noun: string };
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
    label: "Hero",
    description: "Headline, intro, date and a register button",
    fields: ["heading", "text", "image", "button", "showDate"],
    create: () => base(CARD, { showDate: true, buttonLabel: "Reserve my seat" }),
  },
  {
    type: "text",
    label: "Text",
    description: "A heading with a paragraph",
    fields: ["heading", "text"],
    create: () => base(CARD, { heading: "What you'll learn", text: "Describe what attendees will take away from this session." }),
  },
  {
    type: "image",
    label: "Image",
    description: "A full-width picture",
    fields: ["image"],
    create: () => base({ ...PLAIN, radius: 24 }),
  },
  {
    type: "media",
    label: "Image + text",
    description: "A picture beside a heading and paragraph",
    fields: ["heading", "text", "image", "imageSide", "button"],
    create: () => base(CARD, { heading: "Why this matters", text: "Explain the problem this webinar solves.", imageSide: "right" }),
  },
  {
    type: "video",
    label: "Video preview",
    description: "The preview set up in Registration",
    single: true,
    fields: ["heading"],
    create: () => base({ ...CARD, padding: "sm" }),
  },
  {
    type: "countdown",
    label: "Countdown",
    description: "Time left until the session starts",
    single: true,
    fields: ["heading"],
    create: () => base({ ...CARD, align: "center" }, { heading: "Starts in" }),
  },
  {
    type: "presenters",
    label: "Presenters",
    description: "Your host and presenters",
    single: true,
    fields: ["heading"],
    create: () => base(CARD, { heading: "Presented by" }),
  },
  {
    type: "benefits",
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
    label: "Testimonials",
    description: "Quotes from past attendees",
    fields: ["heading", "items"],
    itemLabels: { title: "Name", text: "Quote", noun: "testimonial" },
    create: () => base(CARD, { heading: "What attendees say", items: [item("Attendee name", "Add a short quote from someone who attended.")] }),
  },
  {
    type: "faq",
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
    label: "Call to action",
    description: "A banner with a register button",
    fields: ["heading", "text", "button"],
    create: () => base({ ...CARD, background: "#041B5E", textColor: "#FFFFFF", align: "center", padding: "lg" }, { heading: "Save your seat", text: "Registration takes less than a minute.", buttonLabel: "Register now" }),
  },
  {
    type: "form",
    label: "Registration form",
    description: "The sign-up form (always on the page)",
    single: true,
    fields: ["heading", "text"],
    create: () => base(CARD, { heading: "Reserve your seat" }),
  },
  {
    type: "divider",
    label: "Spacer",
    description: "Empty space between blocks",
    fields: ["height"],
    create: () => base(PLAIN, { height: 32 }),
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
