import { z } from "zod";
import type { PageBlock, PageDesign } from "@/types";
import { MAX_BLOCK_ITEMS, MAX_NESTED_BLOCKS, MAX_PAGE_BLOCKS, MAX_TOTAL_BLOCKS } from "./defaults";
import { PAGE_ICONS } from "./icons";

const HEX = /^#[0-9a-fA-F]{6}$/;
const hexOrEmpty = z.string().regex(/^(#[0-9a-fA-F]{6})?$/);
const hex = z.string().regex(HEX);
const text = (max: number) => z.string().max(max);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);

export const BLOCK_TYPES = ["hero", "text", "image", "media", "video", "countdown", "presenters", "benefits", "faq", "testimonials", "cta", "form", "divider", "heading", "button", "iconbox", "pricing", "stats", "timeline", "gallery", "logos", "tabs", "social", "map", "columns"] as const;
const SINGLE_TYPES = new Set(["video", "countdown", "presenters", "form"]);

const httpsOrEmpty = z.string().max(1000).regex(/^(https:\/\/\S+)?$/, "Links must start with https://");

const itemSchema = z
  .object({ id, title: text(200), text: text(1500), imageUrl: httpsOrEmpty.optional(), link: httpsOrEmpty.optional(), icon: z.enum(PAGE_ICONS).optional() })
  .strict();

const baseShape = {
    id,
    type: z.enum(BLOCK_TYPES),
    style: z
      .object({
        background: hexOrEmpty,
        textColor: hexOrEmpty,
        align: z.enum(["left", "center"]),
        padding: z.enum(["none", "sm", "md", "lg"]),
        width: z.enum(["narrow", "normal", "wide"]),
        radius: z.number().int().min(0).max(40),
        shadow: z.boolean(),
      })
      .strict(),
    heading: text(200),
    text: text(4000),
    imageUrl: text(1000),
    imageAlt: text(200),
    imageSide: z.enum(["left", "right"]),
    buttonLabel: text(60),
    items: z.array(itemSchema).max(MAX_BLOCK_ITEMS),
    showDate: z.boolean(),
    embed: z.boolean().optional(),
    height: z.number().int().min(8).max(160),
    link: httpsOrEmpty.optional(),
    show: z.object({ desktop: z.boolean(), tablet: z.boolean(), mobile: z.boolean() }).strict().optional(),
};

/** An element inside a column: any block except another columns block. */
const childSchema = z.object({ ...baseShape, type: z.enum(BLOCK_TYPES).refine((t) => t !== "columns", "Columns can't be nested.") }).strict();

const blockSchema = z
  .object({
    ...baseShape,
    columns: z.array(z.object({ id, blocks: z.array(childSchema).max(MAX_NESTED_BLOCKS) }).strict()).min(1).max(4).optional(),
  })
  .strict();

export const pageDesignSchema = z
  .object({
    enabled: z.boolean(),
    layout: z.enum(["sidebar", "stacked"]),
    theme: z
      .object({
        background: hex,
        text: hex,
        accent: hex,
        accentText: hex,
        headingFont: z.enum(["brand", "sans", "serif"]),
        maxWidth: z.enum(["md", "lg", "xl", "full"]),
      })
      .strict(),
    blocks: z.array(blockSchema).max(MAX_PAGE_BLOCKS),
  })
  .strict()
  .superRefine((design, ctx) => {
    const ids = new Set<string>();
    const seenSingles = new Set<string>();
    const everything = flattenBlocks(design.blocks);
    if (everything.length > MAX_TOTAL_BLOCKS) ctx.addIssue({ code: "custom", message: `A page can have at most ${MAX_TOTAL_BLOCKS} elements in total.` });
    for (const block of everything) {
      if (ids.has(block.id)) ctx.addIssue({ code: "custom", message: "Two blocks share the same id." });
      ids.add(block.id);
      if (SINGLE_TYPES.has(block.type)) {
        if (seenSingles.has(block.type)) ctx.addIssue({ code: "custom", message: `A page can only have one ${block.type} block.` });
        seenSingles.add(block.type);
      }
      if (block.imageUrl && !/^https:\/\/\S+$/.test(block.imageUrl)) ctx.addIssue({ code: "custom", message: "Block images must be https:// links." });
    }
    if (design.enabled && !seenSingles.has("form")) ctx.addIssue({ code: "custom", message: "The page needs the registration form block." });
  });

/**
 * What a public page may render: a design that is enabled, structurally valid and has its form.
 * Anything else falls back to the standard layout rather than showing a broken page.
 */
export function publishablePageDesign(value: unknown): PageDesign | null {
  if (!value || typeof value !== "object" || (value as { enabled?: unknown }).enabled !== true) return null;
  const parsed = pageDesignSchema.safeParse(value);
  if (!parsed.success || parsed.data.blocks.length === 0) return null;
  return parsed.data as PageDesign;
}

/** Every block on the page, including the elements inside columns. */
export function flattenBlocks<T extends { columns?: { blocks: T[] }[] }>(blocks: T[]): T[] {
  return blocks.flatMap((b) => [b, ...(b.columns?.flatMap((c) => flattenBlocks(c.blocks)) ?? [])]);
}

export function isSingleBlock(type: PageBlock["type"]): boolean {
  return SINGLE_TYPES.has(type);
}
