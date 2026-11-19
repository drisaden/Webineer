import { test } from "node:test";
import assert from "node:assert/strict";
import { blockId, createBlock } from "../../src/lib/page-design/defaults";
import { cloneWithNewIds, countBlocks, findBlock, findParent, insertIntoColumn, mapBlock, moveInColumn, removeBlockById, resizeColumns, treeHasType } from "../../src/lib/page-design/tree";
import { pageDesignSchema } from "../../src/lib/page-design/schema";
import { defaultPageDesign } from "../../src/lib/page-design/defaults";

function sample() {
  const cols = createBlock("columns");
  const a = createBlock("heading");
  const b = createBlock("button");
  const c = createBlock("text");
  const colId = cols.columns![0].id;
  let blocks = [cols];
  blocks = insertIntoColumn(blocks, colId, a);
  blocks = insertIntoColumn(blocks, colId, b);
  blocks = insertIntoColumn(blocks, cols.columns![1].id, c);
  return { blocks, a, b, c, colId, colsId: cols.id };
}

test("nested elements can be found, updated and removed", () => {
  const { blocks, a, b, c, colsId } = sample();
  assert.equal(countBlocks(blocks), 4);
  assert.equal(findBlock(blocks, b.id)?.type, "button");
  assert.equal(findParent(blocks, c.id)?.parent.id, colsId);
  const renamed = mapBlock(blocks, a.id, (x) => ({ ...x, heading: "Hello" }));
  assert.equal(findBlock(renamed, a.id)?.heading, "Hello");
  assert.equal(findBlock(blocks, a.id)?.heading, "Your headline goes here", "the original is untouched");
  assert.equal(countBlocks(removeBlockById(blocks, a.id)), 3);
  assert.equal(findBlock(removeBlockById(blocks, colsId), a.id), null, "removing the columns removes what's inside");
});

test("elements move within their column and never leave it", () => {
  const { blocks, a, b, colId } = sample();
  const moved = moveInColumn(blocks, a.id, 1);
  assert.deepEqual(moved[0].columns![0].blocks.map((x) => x.id), [b.id, a.id]);
  assert.deepEqual(moveInColumn(blocks, a.id, -1)[0].columns![0].blocks.map((x) => x.id), [a.id, b.id], "can't move past the start");
  assert.equal(moved[0].columns![0].id, colId);
});

test("shrinking columns keeps every element", () => {
  const { blocks } = sample();
  const one = resizeColumns(blocks[0], 1, blockId);
  assert.equal(one.columns!.length, 1);
  assert.equal(one.columns![0].blocks.length, 3);
  assert.equal(resizeColumns(blocks[0], 4, blockId).columns!.length, 4);
  assert.equal(resizeColumns(blocks[0], 9, blockId).columns!.length, 2, "more than 4 is ignored");
});

test("copies get brand-new ids all the way down", () => {
  const { blocks } = sample();
  const copy = cloneWithNewIds(blocks[0], blockId);
  const ids = (b: typeof copy): string[] => [b.id, ...(b.columns ?? []).flatMap((c) => [c.id, ...c.blocks.flatMap(ids)]), ...b.items.map((i) => i.id)];
  const original = new Set(ids(blocks[0]));
  assert.ok(ids(copy).every((id) => !original.has(id)));
  assert.equal(countBlocks([copy]), 4);
});

test("a design with the form inside a column is valid; two forms, or nested columns, are not", () => {
  const base = defaultPageDesign();
  const formless = { ...base, blocks: base.blocks.filter((b) => b.type !== "form") };
  const { blocks } = sample();
  const withForm = insertIntoColumn(blocks, blocks[0].columns![1].id, createBlock("form"));
  assert.ok(pageDesignSchema.safeParse({ ...formless, blocks: [...formless.blocks, ...withForm] }).success, "form inside a column counts");
  assert.ok(treeHasType(withForm, "form"));
  assert.equal(pageDesignSchema.safeParse({ ...base, blocks: [...base.blocks, ...withForm] }).success, false, "two forms");
  const nested = createBlock("columns");
  nested.columns![0].blocks.push(createBlock("columns"));
  assert.equal(pageDesignSchema.safeParse({ ...base, blocks: [...base.blocks, nested] }).success, false, "columns can't nest");
});

test("designs reject unsafe links, bad colours and unknown icons", () => {
  const base = defaultPageDesign();
  const bad = (patch: object) => pageDesignSchema.safeParse({ ...base, blocks: [...base.blocks, { ...createBlock("button"), ...patch }] }).success;
  assert.equal(bad({ link: "https://example.com/x" }), true);
  assert.equal(bad({ link: "javascript:alert(1)" }), false);
  assert.equal(bad({ link: "http://example.com" }), false);
  assert.equal(bad({ style: { ...createBlock("button").style, background: "red" } }), false);
  const icon = createBlock("iconbox");
  icon.items[0] = { ...icon.items[0], icon: "skull" as never };
  assert.equal(pageDesignSchema.safeParse({ ...base, blocks: [...base.blocks, icon] }).success, false);
  const logo = createBlock("logos");
  logo.items = [{ id: "l1", title: "x", text: "", imageUrl: "data:image/png;base64,AAAA" }];
  assert.equal(pageDesignSchema.safeParse({ ...base, blocks: [...base.blocks, logo] }).success, false, "no data: URLs");
});

test("designs saved before the new fields still validate", () => {
  const old = defaultPageDesign();
  assert.ok(pageDesignSchema.safeParse(old).success);
  assert.ok(pageDesignSchema.safeParse({ ...old, blocks: old.blocks.map(({ show, link, columns, ...rest }) => rest) }).success);
});

import { ALL_TEMPLATES, templateNeedsPaidPlan } from "../../src/lib/page-design/templates";
import { pageDesignPlanIssue } from "../../src/lib/page-design/plan";
import { SAAS_PLANS } from "../../src/services/billing-entitlements";
import { isBlockEmpty } from "../../src/components/page-design/blocks";

test("every template is a valid design with the form, and unique ids", () => {
  assert.ok(ALL_TEMPLATES.length >= 14, `has ${ALL_TEMPLATES.length} templates`);
  assert.equal(new Set(ALL_TEMPLATES.map((t) => t.id)).size, ALL_TEMPLATES.length);
  for (const t of ALL_TEMPLATES) {
    const built = t.build();
    const parsed = pageDesignSchema.safeParse({ enabled: true, ...built });
    assert.ok(parsed.success, `${t.id}: ${parsed.success ? "" : parsed.error.issues.map((i) => i.message).join("; ")}`);
    assert.ok(treeHasType(built.blocks, "form"), `${t.id} has the form`);
  }
  assert.ok(ALL_TEMPLATES.some((t) => t.kind === "form") && ALL_TEMPLATES.some((t) => t.kind === "long"));
});

test("free plans can use the basic templates only, within the element limit", () => {
  const free = SAAS_PLANS.free.entitlements.pageBuilder;
  const usable = ALL_TEMPLATES.filter((t) => !templateNeedsPaidPlan(t));
  assert.ok(usable.length >= 5);
  for (const t of usable) assert.equal(pageDesignPlanIssue({ enabled: true, ...t.build() }, free), null, t.id);
  for (const t of ALL_TEMPLATES.filter(templateNeedsPaidPlan)) assert.ok(pageDesignPlanIssue({ enabled: true, ...t.build() }, free), `${t.id} is blocked on free`);
  for (const t of ALL_TEMPLATES) assert.equal(pageDesignPlanIssue({ enabled: true, ...t.build() }, SAAS_PLANS.starter.entitlements.pageBuilder), null, `${t.id} fits Starter`);
});

test("the element limit counts what is inside columns", () => {
  const free = SAAS_PLANS.free.entitlements.pageBuilder;
  const d = defaultPageDesign();
  const many = { ...d, blocks: [...d.blocks, ...Array.from({ length: 8 }, () => createBlock("text"))] };
  assert.match(pageDesignPlanIssue(many, free) ?? "", /up to 12/);
  assert.equal(pageDesignPlanIssue({ ...many, enabled: false }, free), null, "a design that isn't live isn't checked");
});

test("empty new elements are hidden from visitors but not from the builder", () => {
  const view = { mode: "schedule_later", sessions: [], presenters: [], hostName: "", videoPreview: null } as never;
  for (const type of ["button", "gallery", "logos", "social", "map"] as const) {
    const b = createBlock(type);
    if (type === "button") b.buttonLabel = "";
    if (type === "map") b.text = "";
    assert.equal(isBlockEmpty(b, view), true, type);
  }
  assert.equal(isBlockEmpty(createBlock("stats"), view), false);
  assert.equal(isBlockEmpty(createBlock("columns"), view), true, "empty columns render nothing");
});

import { moveToColumn } from "../../src/lib/page-design/tree";
{
  const build = () => {
    const cols = createBlock("columns");
    const a = createBlock("text"), b = createBlock("heading"), c = createBlock("button");
    cols.columns = [{ id: "c1", blocks: [a, b] }, { id: "c2", blocks: [c] }];
    return { cols, a, b, c };
  };
  test("reorders inside a column", () => {
    const { cols, a, b } = build();
    const out = moveToColumn([cols], b.id, "c1", 0, 6)[0].columns!;
    assert.deepEqual(out[0].blocks.map((x) => x.id), [b.id, a.id]);
  });
  test("moves to another column at an index", () => {
    const { cols, a, b, c } = build();
    const out = moveToColumn([cols], a.id, "c2", 0, 6)[0].columns!;
    assert.deepEqual(out[0].blocks.map((x) => x.id), [b.id]);
    assert.deepEqual(out[1].blocks.map((x) => x.id), [a.id, c.id]);
  });
  test("a full column refuses blocks from elsewhere but allows reordering", () => {
    const { cols, a, c } = build();
    assert.equal(moveToColumn([cols], c.id, "c1", 0, 2)[0].columns![0].blocks.length, 2);
    assert.deepEqual(moveToColumn([cols], a.id, "c1", 2, 2)[0].columns![0].blocks.length, 2);
  });
  test("unknown ids change nothing", () => {
    const { cols } = build();
    assert.deepEqual(moveToColumn([cols], "nope", "c1", 0, 6), [cols]);
    assert.deepEqual(moveToColumn([cols], cols.columns![0].blocks[0].id, "nope", 0, 6), [cols]);
  });
}
