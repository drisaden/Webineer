import type { PageBlock } from "@/types";

/** Helpers for the nested block tree: top-level blocks, with elements inside columns. */

export function findBlock(blocks: PageBlock[], id: string | null): PageBlock | null {
  if (!id) return null;
  for (const b of blocks) {
    if (b.id === id) return b;
    for (const c of b.columns ?? []) {
      const found = findBlock(c.blocks, id);
      if (found) return found;
    }
  }
  return null;
}

/** The columns block that holds this element, if it is nested. */
export function findParent(blocks: PageBlock[], id: string): { parent: PageBlock; columnId: string } | null {
  for (const b of blocks) {
    for (const c of b.columns ?? []) {
      if (c.blocks.some((x) => x.id === id)) return { parent: b, columnId: c.id };
    }
  }
  return null;
}

export function mapBlock(blocks: PageBlock[], id: string, fn: (b: PageBlock) => PageBlock): PageBlock[] {
  return blocks.map((b) => {
    if (b.id === id) return fn(b);
    if (!b.columns) return b;
    return { ...b, columns: b.columns.map((c) => ({ ...c, blocks: mapBlock(c.blocks, id, fn) })) };
  });
}

export function removeBlockById(blocks: PageBlock[], id: string): PageBlock[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => (b.columns ? { ...b, columns: b.columns.map((c) => ({ ...c, blocks: removeBlockById(c.blocks, id) })) } : b));
}

export function countBlocks(blocks: PageBlock[]): number {
  return blocks.reduce((n, b) => n + 1 + (b.columns?.reduce((m, c) => m + countBlocks(c.blocks), 0) ?? 0), 0);
}

export function containsType(block: PageBlock, type: PageBlock["type"]): boolean {
  return block.type === type || !!block.columns?.some((c) => c.blocks.some((x) => containsType(x, type)));
}

export function treeHasType(blocks: PageBlock[], type: PageBlock["type"]): boolean {
  return blocks.some((b) => containsType(b, type));
}

/** Gives a copy of a block (and everything inside it) fresh ids. */
export function cloneWithNewIds(block: PageBlock, newId: (prefix?: string) => string): PageBlock {
  return {
    ...block,
    id: newId(),
    style: { ...block.style },
    show: block.show ? { ...block.show } : undefined,
    items: block.items.map((i) => ({ ...i, id: newId("i") })),
    columns: block.columns?.map((c) => ({ id: newId("c"), blocks: c.blocks.map((x) => cloneWithNewIds(x, newId)) })),
  };
}

export function insertIntoColumn(blocks: PageBlock[], columnId: string, child: PageBlock): PageBlock[] {
  return blocks.map((b) => {
    if (!b.columns) return b;
    return { ...b, columns: b.columns.map((c) => (c.id === columnId ? { ...c, blocks: [...c.blocks, child] } : { ...c, blocks: insertIntoColumn(c.blocks, columnId, child) })) };
  });
}

/** Moves a nested element up or down within its column. */
export function moveInColumn(blocks: PageBlock[], id: string, direction: -1 | 1): PageBlock[] {
  return blocks.map((b) => {
    if (!b.columns) return b;
    return {
      ...b,
      columns: b.columns.map((c) => {
        const from = c.blocks.findIndex((x) => x.id === id);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= c.blocks.length) return c;
        const next = [...c.blocks];
        [next[from], next[to]] = [next[to], next[from]];
        return { ...c, blocks: next };
      }),
    };
  });
}

/** Changes the number of columns. Elements from removed columns move into the last column that is kept. */
export function resizeColumns(block: PageBlock, count: number, newId: (prefix?: string) => string): PageBlock {
  const cols = block.columns ?? [];
  if (count === cols.length || count < 1 || count > 4) return block;
  if (count > cols.length) return { ...block, columns: [...cols, ...Array.from({ length: count - cols.length }, () => ({ id: newId("c"), blocks: [] }))] };
  const kept = cols.slice(0, count).map((c) => ({ ...c }));
  const spill = cols.slice(count).flatMap((c) => c.blocks);
  kept[count - 1] = { ...kept[count - 1], blocks: [...kept[count - 1].blocks, ...spill] };
  return { ...block, columns: kept };
}
