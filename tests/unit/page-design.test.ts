import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_DEFINITIONS, createBlock, defaultPageDesign, PAGE_TEMPLATES } from "../../src/lib/page-design/defaults";
import { pageDesignSchema, publishablePageDesign } from "../../src/lib/page-design/schema";
import { sectionSchemas } from "../../src/lib/webinar-workflow/schemas";
import { createDefaultWorkflowConfig } from "../../src/lib/webinar-workflow/defaults";

describe("landing page design", () => {
  test("every block type and template produces a valid design", () => {
    for (const definition of BLOCK_DEFINITIONS) {
      const design = { ...defaultPageDesign(), blocks: [createBlock(definition.type), ...(definition.type === "form" ? [] : [createBlock("form")])] };
      assert.equal(pageDesignSchema.safeParse(design).success, true, definition.type);
    }
    for (const template of PAGE_TEMPLATES) {
      const design = { enabled: true, ...template.build() };
      assert.equal(pageDesignSchema.safeParse(design).success, true, template.id);
      assert.equal(design.blocks.filter((b) => b.type === "form").length, 1, `${template.id} has exactly one form`);
    }
  });

  test("an enabled design must contain the registration form exactly once", () => {
    const design = defaultPageDesign();
    assert.equal(pageDesignSchema.safeParse({ ...design, blocks: design.blocks.filter((b) => b.type !== "form") }).success, false);
    assert.equal(pageDesignSchema.safeParse({ ...design, blocks: [...design.blocks, createBlock("form")] }).success, false);
    // A disabled (parked) design may be incomplete.
    assert.equal(pageDesignSchema.safeParse({ ...design, enabled: false, blocks: design.blocks.filter((b) => b.type !== "form") }).success, true);
  });

  test("unsafe values are rejected: scripts in links, non-hex colours, unknown fields, oversized lists", () => {
    const design = defaultPageDesign();
    const hero = design.blocks[0];
    const withHero = (patch: object) => ({ ...design, blocks: [{ ...hero, ...patch }, ...design.blocks.slice(1)] });
    assert.equal(pageDesignSchema.safeParse(withHero({ imageUrl: "javascript:alert(1)" })).success, false);
    assert.equal(pageDesignSchema.safeParse(withHero({ imageUrl: "http://example.com/a.png" })).success, false);
    assert.equal(pageDesignSchema.safeParse(withHero({ imageUrl: "https://example.com/a.png" })).success, true);
    assert.equal(pageDesignSchema.safeParse(withHero({ style: { ...hero.style, background: "red; background:url(x)" } })).success, false);
    assert.equal(pageDesignSchema.safeParse(withHero({ html: "<script>" })).success, false);
    assert.equal(pageDesignSchema.safeParse({ ...design, theme: { ...design.theme, accent: "url(x)" } }).success, false);
    assert.equal(pageDesignSchema.safeParse({ ...design, blocks: Array.from({ length: 61 }, () => createBlock("text")).concat(createBlock("form")) }).success, false);
    const many = createBlock("faq");
    many.items = Array.from({ length: 13 }, (_, i) => ({ id: `i${i}`, title: "q", text: "a" }));
    assert.equal(pageDesignSchema.safeParse({ ...design, blocks: [many, createBlock("form")] }).success, false);
  });

  test("the public page only gets a design that is enabled and valid", () => {
    const design = defaultPageDesign();
    assert.ok(publishablePageDesign(design));
    assert.equal(publishablePageDesign({ ...design, enabled: false }), null);
    assert.equal(publishablePageDesign(undefined), null);
    assert.equal(publishablePageDesign({ ...design, blocks: [] }), null);
    assert.equal(publishablePageDesign({ ...design, theme: { ...design.theme, text: "nope" } }), null);
  });

  test("the registration section accepts a design, and stays valid without one", () => {
    const config = createDefaultWorkflowConfig({ hostName: "Host", hostEmail: "h@example.com", timezone: "Africa/Lagos" });
    assert.equal(sectionSchemas.registration.safeParse(config.registration).success, true);
    assert.equal(sectionSchemas.registration.safeParse({ ...config.registration, page: defaultPageDesign() }).success, true);
    const legacy = { ...config.registration } as Record<string, unknown>;
    delete legacy.videoPreview;
    assert.equal(sectionSchemas.registration.safeParse(legacy).success, true);
  });
});
