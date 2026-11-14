import { after, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { db, resetDatabase } from "./helpers";
import { checkRateLimit } from "../../src/lib/security/rate-limit";
import { readJsonBody, readTextBody } from "../../src/lib/server/http";

// Database mode for the limiter (demo mode would use memory).
Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", NEXT_PUBLIC_DEMO_MODE: "false" });

beforeEach(resetDatabase);
after(() => db.$disconnect());

describe("shared rate limiter", () => {
  test("exactly `limit` requests pass under concurrency, across 'instances'", async () => {
    const results = await Promise.all(Array.from({ length: 30 }, () => checkRateLimit("login:ip:203.0.113.9", 10, 60_000)));
    assert.equal(results.filter((r) => r.allowed).length, 10);
    const blocked = results.find((r) => !r.allowed)!;
    assert.ok(blocked.retryAfterSeconds >= 1 && blocked.retryAfterSeconds <= 60);
  });

  test("keys are hashed: no IPs or emails are stored", async () => {
    await checkRateLimit("reset:email:ada@example.com", 3, 60_000);
    const rows = await db.rateLimit.findMany();
    assert.equal(rows.length, 1);
    assert.match(rows[0].key, /^[0-9a-f]{40}$/);
    assert.ok(!rows[0].key.includes("ada"));
  });

  test("a new window starts a new count; separate keys are independent", async () => {
    for (let i = 0; i < 3; i++) await checkRateLimit("k:a", 3, 1000);
    assert.equal((await checkRateLimit("k:a", 3, 1000)).allowed, false);
    assert.equal((await checkRateLimit("k:b", 3, 1000)).allowed, true);
    await new Promise((r) => setTimeout(r, 1100));
    assert.equal((await checkRateLimit("k:a", 3, 1000)).allowed, true);
  });
});

describe("bounded request bodies", () => {
  const req = (body: string, headers: Record<string, string> = {}) => new Request("http://x/api", { method: "POST", body, headers: { "content-type": "application/json", ...headers } });

  test("rejects by declared length before reading", async () => {
    const r = await readJsonBody(req("{}", { "content-length": "999999" }), 1024);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.response.status, 413);
  });

  test("rejects oversized streamed bodies without a content-length", async () => {
    const big = JSON.stringify({ a: "x".repeat(5000) });
    const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(big)); c.close(); } });
    const r = await readJsonBody(new Request("http://x", { method: "POST", body: stream, duplex: "half" } as RequestInit), 1024);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.response.status, 413);
  });

  test("parses valid JSON, 400 on invalid, fallback on empty", async () => {
    const ok = await readJsonBody<{ a: number }>(req('{"a":1}'), 1024);
    assert.deepEqual(ok.ok && ok.data, { a: 1 });
    const bad = await readJsonBody(req("{nope"), 1024);
    assert.equal(!bad.ok && bad.response.status, 400);
    const empty = await readJsonBody(req(""), 1024, {});
    assert.deepEqual(empty.ok && empty.data, {});
  });

  test("raw text for signatures is bounded too", async () => {
    assert.equal(await readTextBody(req("abc"), 10), "abc");
    assert.equal(await readTextBody(req("x".repeat(20)), 10), null);
  });
});
