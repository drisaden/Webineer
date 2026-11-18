import type { PageDesign } from "@/types";
import { ADVANCED_BLOCK_TYPES } from "./defaults";
import { flattenBlocks } from "./schema";

export interface PageBuilderLimits {
  /** Most elements (blocks plus everything inside columns) a page may have. */
  maxElements: number;
  /** Pricing tables, galleries, columns and the other advanced elements. */
  advancedElements: boolean;
  /** Whether the full template gallery is open. */
  allTemplates: boolean;
}

/** The first thing about a design the plan doesn't allow, or null when it is fine. */
export function pageDesignPlanIssue(design: PageDesign | undefined, limits: PageBuilderLimits): string | null {
  if (!design?.enabled) return null;
  const all = flattenBlocks(design.blocks);
  if (all.length > limits.maxElements) return `Your plan allows up to ${limits.maxElements} elements on a page. This design has ${all.length}. Remove some, or upgrade in Billing.`;
  if (!limits.advancedElements) {
    const used = all.find((b) => ADVANCED_BLOCK_TYPES.includes(b.type));
    if (used) return "Columns, pricing tables, galleries and other advanced elements need a paid plan. Remove them, or upgrade in Billing.";
  }
  return null;
}
