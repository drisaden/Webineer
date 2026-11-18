import { after, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createUser, db, resetDatabase } from "./helpers";
import { sendWelcomeEmail } from "../../src/server/email/welcome";
import { renderWelcome } from "../../src/server/email/templates";

beforeEach(resetDatabase);
after(() => db.$disconnect());

describe("welcome email", () => {
  test("renders a greeting, the three steps and safe links", () => {
    const e = renderWelcome({ name: "Ada Obi", workspaceName: "Ada <script>", dashboardUrl: "https://x.test/dashboard", helpUrl: "https://x.test/help" });
    assert.equal(e.subject, "Welcome to Webineer");
    assert.match(e.html, /Hi Ada,/);
    assert.ok(!e.html.includes("<script>"), "workspace name is escaped");
    assert.match(e.text, /1\. Create your first webinar/);
    assert.match(e.text, /https:\/\/x\.test\/dashboard/);
    assert.match(renderWelcome({ name: "ada@example.com", dashboardUrl: "u", helpUrl: "h" }).html, /Hi there,/, "never greets with an email address");
  });

  test("is sent once per user, however often it is requested", async () => {
    const u = await createUser("welcome@example.com");
    for (let i = 0; i < 3; i++) await sendWelcomeEmail({ userId: u.id, email: u.email, name: "Wel Come" });
    const rows = await db.emailLog.findMany({ where: { toEmail: "welcome@example.com" } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].template, "welcome");
    assert.equal(rows[0].dedupeKey, `welcome:${u.id}`);
    const other = await createUser("other@example.com");
    await sendWelcomeEmail({ userId: other.id, email: other.email });
    assert.equal(await db.emailLog.count({ where: { template: "welcome" } }), 2);
  });
});
