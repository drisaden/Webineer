import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { fitWithin, formatBytes, shouldResize, SKIP_BELOW_BYTES } from "../../src/lib/images/resize";

describe("image resize maths", () => {
  test("shrinks the longest edge and keeps the aspect ratio", () => {
    assert.deepEqual(fitWithin(4000, 3000, 2000), { width: 2000, height: 1500 });
    assert.deepEqual(fitWithin(3000, 4000, 2000), { width: 1500, height: 2000 });
    assert.deepEqual(fitWithin(6000, 1000, 2000), { width: 2000, height: 333 });
  });
  test("never enlarges and survives bad input", () => {
    assert.deepEqual(fitWithin(800, 600, 2000), { width: 800, height: 600 });
    assert.deepEqual(fitWithin(0, 600, 2000), { width: 0, height: 0 });
    assert.ok(fitWithin(10000, 1, 2000).height >= 1);
  });
  test("leaves GIFs, SVGs and already-small images alone", () => {
    assert.equal(shouldResize("image/gif", 9_000_000, 4000, 3000), false);
    assert.equal(shouldResize("image/svg+xml", 9_000_000, 4000, 3000), false);
    assert.equal(shouldResize("image/jpeg", SKIP_BELOW_BYTES - 1, 1200, 800), false);
    assert.equal(shouldResize("image/jpeg", SKIP_BELOW_BYTES + 1, 1200, 800), true);
    assert.equal(shouldResize("image/png", 50_000, 4000, 3000), true, "oversized dimensions are resized even when the file is small");
  });
  test("sizes read naturally", () => {
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(2048), "2 KB");
    assert.equal(formatBytes(4.2 * 1024 * 1024), "4.2 MB");
  });
});
