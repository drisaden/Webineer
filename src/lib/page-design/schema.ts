import { z } from "zod";
import type { PageBlock, PageDesign } from "@/types";
import { MAX_BLOCK_ITEMS, MAX_PAGE_BLOCKS } from "./defaults";

const HEX = /^#[0-9a-fA-F]{6}$/;
const hexOrEmpty = z.string().regex(/^(#[0-9a-fA-F]{6})?$/);
const hex = z.string().regex(HEX);
const text = (max: number) => z.string().max(max);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);

export const BLOCK_TYPES = ["hero", "text", "image", "media", "video", "countdown", "presenters", "benefits", "faq", "testimonials", "cta", "form", "divider"] as const;
const SINGLE_TYPES = new Set(["video", "countdown", "presenters", "form"]);

const blockSchema = z
  .object({
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
    items: z.array(z.object({ id, title: text(200), text: text(1500) }).strict()).max(MAX_BLOCK_ITEMS),
    showDate: z.boolean(),
    height: z.number().int().min(8).max(160),
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
        maxWidth: z.enum(["md", "lg", "xl"]),
      })
      .strict(),
    blocks: z.array(blockSchema).max(MAX_PAGE_BLOCKS),
  })
  .strict()
  .superRefine((design, ctx) => {
    const ids = new Set<string>();
    const seenSingles = new Set<string>();
    for (const block of design.blocks) {
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

export function isSingleBlock(type: PageBlock["type"]): boolean {
  return SINGLE_TYPES.has(type);
}
