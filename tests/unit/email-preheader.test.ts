import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { renderLayout, usefulPreheader } from "../../src/server/email/layout";

describe("email preheader", () => {
  test("is dropped when it repeats the start of the body (the preview would read twice)", () => {
    const body = 'Your webinar &quot;YOGA Challenge&quot; is now published and accepting registrations.<br /><br />Public page: https://x.test/w/y';
    assert.equal(usefulPreheader('Your webinar "YOGA Challenge" is now published and accepting registrations.', body), undefined);
    const html = renderLayout({ contentHtml: body, preheader: 'Your webinar "YOGA Challenge" is now published and accepting registrations.' });
    assert.equal(html.includes("display:none;max-height:0"), false);
    assert.equal(html.match(/is now published and accepting registrations/g)?.length, 1);
  });
  test("is kept when it adds something the body doesn't say", () => {
    assert.equal(usefulPreheader("We've received your request (REF-1).", "<p>Thanks for writing to us.</p>"), "We've received your request (REF-1).");
  });
  test("handles missing preheaders", () => {
    assert.equal(usefulPreheader(undefined, "<p>Hi</p>"), undefined);
    assert.equal(usefulPreheader("  ", "<p>Hi</p>"), undefined);
  });
});
