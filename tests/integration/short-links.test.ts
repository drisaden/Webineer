import { after, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createUser, createWebinar, db, resetDatabase } from "./helpers";
import { createOrganizationWithOwner } from "../../src/server/db/organizations";
import { ShortLinkError, getOrCreateShortLink, resolveShortLink, shortLinkFor } from "../../src/server/short-links/service";

beforeEach(resetDatabase);
after(() => db.$disconnect());

async function setup() {
  const a = await createOrganizationWithOwner(db, await createUser(), { name: "A" });
  const b = await createOrganizationWithOwner(db, await createUser(), { name: "B" });
  return { a, b, wa: await createWebinar(a.id, "alpha-talk"), wb: await createWebinar(b.id, "beta-talk") };
}

describe("short links", () => {
  test("one link per webinar, created once, even when asked at the same time", async () => {
    const { a, wa } = await setup();
    assert.equal(await shortLinkFor(a.id, wa.id), null);
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => getOrCreateShortLink(a.id, wa.id)));
    assert.equal(new Set(results.map((r) => r.code)).size, 1);
    assert.equal(await db.shortLink.count(), 1);
    assert.match(results[0].url, /\/s\/[a-z2-9]{7}$/);
    assert.equal((await shortLinkFor(a.id, wa.id))?.code, results[0].code);
  });

  test("another workspace cannot create or see a link for this webinar", async () => {
    const { a, b, wa } = await setup();
    await assert.rejects(getOrCreateShortLink(b.id, wa.id), (e: unknown) => e instanceof ShortLinkError && e.status === 404);
    await getOrCreateShortLink(a.id, wa.id);
    assert.equal(await shortLinkFor(b.id, wa.id), null);
    assert.equal(await db.shortLink.count(), 1);
  });

  test("a code leads to the webinar's current page and counts the visit", async () => {
    const { a, wa } = await setup();
    const { code } = await getOrCreateShortLink(a.id, wa.id);
    assert.deepEqual(await resolveShortLink(code), { slug: "alpha-talk", published: false });
    await new Promise((r) => setTimeout(r, 100));
    await db.webinar.update({ where: { id: wa.id }, data: { slug: "alpha-talk-renamed" } });
    assert.equal((await resolveShortLink(code))?.slug, "alpha-talk-renamed", "renaming the page does not break the short link");
    await new Promise((r) => setTimeout(r, 100));
    const row = await db.shortLink.findUniqueOrThrow({ where: { code } });
    assert.equal(row.clicks, 2);
    assert.ok(row.lastClickedAt);
  });

  test("unknown, malformed and deleted-webinar codes resolve to nothing", async () => {
    const { a, wa } = await setup();
    const { code } = await getOrCreateShortLink(a.id, wa.id);
    assert.equal(await resolveShortLink("zzzzzzz"), null);
    assert.equal(await resolveShortLink("../../x"), null);
    assert.equal(await resolveShortLink(""), null);
    await db.webinar.update({ where: { id: wa.id }, data: { deletedAt: new Date() } });
    assert.equal(await resolveShortLink(code), null);
  });

  test("the database rejects a code with the wrong shape and keeps rows private", async () => {
    const { a, wa } = await setup();
    await assert.rejects(db.shortLink.create({ data: { code: "BAD CODE", organizationId: a.id, webinarId: wa.id } }));
    const rls = await db.$queryRaw<{ relrowsecurity: boolean }[]>`SELECT relrowsecurity FROM pg_class WHERE relname = 'short_links'`;
    assert.equal(rls[0].relrowsecurity, true);
  });
});
