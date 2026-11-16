import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { HELP_ARTICLES, HELP_CATEGORIES, articlesIn, getArticle, liveFeatureRows, planLimitRows, searchArticles } from "../../src/lib/support/articles";
import { validPhone, cleanMessage } from "../../src/server/support/service";
import { supportContact, telHref } from "../../src/server/support/config";
import { SAAS_PLANS } from "../../src/services/billing-entitlements";

describe("help articles", () => {
  test("slugs are unique and url-safe", () => {
    const slugs = HELP_ARTICLES.map((a) => a.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const s of slugs) assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test("every article has a known category, content and valid related links", () => {
    const cats = new Set(HELP_CATEGORIES.map((c) => c.id));
    for (const a of HELP_ARTICLES) {
      assert.ok(cats.has(a.category), a.slug);
      assert.ok(a.title && a.summary && a.body.length > 0, a.slug);
      assert.match(a.updated, /^\d{4}-\d{2}-\d{2}$/);
      for (const r of a.related) {
        assert.ok(getArticle(r), `${a.slug} -> ${r}`);
        assert.notEqual(r, a.slug);
      }
    }
  });

  test("every category has articles", () => {
    for (const c of HELP_CATEGORIES) assert.ok(articlesIn(c.id).length > 0, c.id);
  });

  test("plan tables are generated from the real plans", () => {
    const rows = planLimitRows();
    assert.equal(rows.length, Object.keys(SAAS_PLANS).length);
    assert.ok(liveFeatureRows().length > 0);
  });

  test("search ranks title matches and needs every word", () => {
    const hits = searchArticles("reminder emails");
    assert.ok(hits.length > 0);
    assert.equal(searchArticles("zzzqqq nothing").length, 0);
    assert.equal(searchArticles("   ").length, HELP_ARTICLES.length);
    const first = searchArticles(HELP_ARTICLES[0].title)[0];
    assert.equal(first.slug, HELP_ARTICLES[0].slug);
  });
});

describe("support input checks", () => {
  test("phone numbers", () => {
    for (const ok of ["+234 801 234 5678", "08012345678", "(555) 123-4567"]) assert.ok(validPhone(ok), ok);
    for (const bad of ["abc", "123", "+1234567890123456789", "12-ab-3456", ""]) assert.ok(!validPhone(bad), bad);
  });

  test("messages are trimmed and bounded", () => {
    assert.equal(cleanMessage("  hi   there  ", 100), "hi there");
    assert.equal(cleanMessage("x".repeat(5000), 4000).length, 4000);
    assert.equal(cleanMessage("   ", 100), "");
  });
});

describe("support contact settings", () => {
  test("falls back from SUPPORT_EMAIL to the reply-to and sender addresses", () => {
    assert.equal(supportContact({ SUPPORT_EMAIL: "help@x.com", SMTP_REPLY_TO: "r@x.com" }).email, "help@x.com");
    assert.equal(supportContact({ SMTP_REPLY_TO: "r@x.com", SMTP_FROM: "A <f@x.com>" }).email, "r@x.com");
    assert.equal(supportContact({ SMTP_FROM: "Webineer <f@x.com>" }).email, "f@x.com");
    assert.equal(supportContact({}).email, null);
  });
  test("phone is shown only when valid, and hours have a default", () => {
    assert.equal(supportContact({ SUPPORT_PHONE: "+234 801 234 5678" }).phone, "+234 801 234 5678");
    assert.equal(supportContact({ SUPPORT_PHONE: "call me" }).phone, null);
    assert.match(supportContact({}).hours, /Monday to Friday/);
    assert.equal(telHref("+234 (801) 234-5678"), "tel:+2348012345678");
  });
});
