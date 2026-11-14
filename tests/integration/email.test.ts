import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac } from "node:crypto";
import { createUser, db, resetDatabase } from "./helpers";
import { createOrganizationWithOwner } from "../../src/server/db/organizations";
import { deliverEmail, MAX_EMAIL_ATTEMPTS, processEmailQueue, queueAndDeliver, queueEmail, sendNow } from "../../src/server/email/outbox";
import { planAuthEmails, verifyStandardWebhook, hookSecrets } from "../../src/server/email/auth-hook";
import { renderAuthEmail, renderReceipt } from "../../src/server/email/templates";
import { sendPaymentReceipt } from "../../src/server/email/receipts";
import { getEmailProvider } from "../../src/providers/email";

// SMTP config for this suite: a local SMTP sink (tests/support/fake-smtp.mjs). Read lazily per send.
const SMTP = 2535, CTRL = 2536;
Object.assign(process.env, {
  SMTP_HOST: "127.0.0.1", SMTP_PORT: String(SMTP), SMTP_SECURE: "false", SMTP_ALLOW_INSECURE: "true",
  SMTP_USER: "mailer@example.test", SMTP_PASS: "smtp-test-password", SMTP_FROM: "Webineer <no-reply@example.test>",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", NEXT_PUBLIC_DEMO_MODE: "false",
  NEXT_PUBLIC_APP_URL: "https://app.example.test", REGISTRATION_LINK_SECRET: "test-link-secret-0123456789abcdefghijkl",
});
const ctrl = (path: string) => fetch(`http://127.0.0.1:${CTRL}${path}`).then((r) => r.json());
type Msg = { to: string[]; subject: string; headers: Record<string, string>; decoded: string; raw: string };
const messages = (): Promise<Msg[]> => ctrl("/messages");

let smtp: ChildProcess;
before(async () => {
  smtp = spawn(process.execPath, ["tests/support/fake-smtp.mjs"], { env: { ...process.env, FAKE_SMTP_PORT: String(SMTP), FAKE_SMTP_HTTP: String(CTRL) }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try { await ctrl("/reset"); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error("fake smtp did not start");
});
after(async () => { smtp?.kill(); await db.$disconnect(); });
beforeEach(async () => { await resetDatabase(); await ctrl("/reset"); });

const mail = (over: Partial<Parameters<typeof queueEmail>[0]> = {}) => ({ template: "test", to: "Reader@Example.com", toName: "Reader", subject: "Hello", html: "<p>Hi</p>", text: "Hi", ...over });

describe("outbox delivery", () => {
  test("queues, sends over SMTP, logs, and clears the stored body", async () => {
    const r = await sendNow(mail({ dedupeKey: "k1" }));
    assert.equal(r.status, "queued");
    assert.equal("delivery" in r && r.delivery, "sent");
    const row = await db.emailLog.findFirstOrThrow();
    assert.equal(row.status, "SENT");
    assert.equal(row.toEmail, "reader@example.com");
    assert.equal(row.attempts, 1);
    assert.ok(row.sentAt && row.providerMessageId);
    assert.equal(row.bodyHtml, null);
    assert.equal(row.bodyText, null);
    const [m] = await messages();
    assert.deepEqual(m.to, ["reader@example.com"]);
    assert.equal(m.subject, "Hello");
    assert.match(m.headers.from, /no-reply@example\.test/);
  });

  test("the same dedupe key never sends twice (sequential and concurrent)", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => queueAndDeliver(mail({ dedupeKey: "reminder:abc" }))));
    assert.equal(results.filter((r) => r.status === "queued").length, 1);
    assert.equal((await queueAndDeliver(mail({ dedupeKey: "reminder:abc" }))).status, "duplicate");
    assert.equal((await messages()).length, 1);
    assert.equal(await db.emailLog.count(), 1);
  });

  test("concurrent delivery attempts of one email send it once", async () => {
    const q = await queueEmail(mail());
    assert.equal(q.status, "queued");
    const outcomes = await Promise.all(Array.from({ length: 6 }, () => deliverEmail(q.id!)));
    assert.equal(outcomes.filter((o) => o === "sent").length, 1);
    assert.equal((await messages()).length, 1);
  });

  test("temporary failures are retried with backoff by the queue runner", async () => {
    await ctrl("/fail?code=451&n=1");
    const r = await sendNow(mail());
    assert.equal("delivery" in r && r.delivery, "retry");
    let row = await db.emailLog.findFirstOrThrow();
    assert.equal(row.status, "FAILED");
    assert.equal(row.attempts, 1);
    assert.ok(row.scheduledFor! > new Date());
    assert.ok(row.bodyHtml, "body kept for retry");
    assert.match(row.lastError ?? "", /451/);
    assert.equal((await processEmailQueue()).sent, 0, "not due yet");
    await db.emailLog.update({ where: { id: row.id }, data: { scheduledFor: new Date(Date.now() - 1000) } });
    assert.equal((await processEmailQueue()).sent, 1);
    row = await db.emailLog.findFirstOrThrow();
    assert.equal(row.status, "SENT");
    assert.equal(row.attempts, 2);
  });

  test("SMTP auth failures are treated as temporary", async () => {
    await ctrl("/auth-fail?n=1");
    const r = await sendNow(mail());
    assert.equal("delivery" in r && r.delivery, "retry");
  });

  test("permanent rejections are not retried and the body is discarded", async () => {
    await ctrl("/fail?code=550&n=1");
    const r = await sendNow(mail());
    assert.equal("delivery" in r && r.delivery, "failed");
    const row = await db.emailLog.findFirstOrThrow();
    assert.equal(row.status, "FAILED");
    assert.equal(row.attempts, MAX_EMAIL_ATTEMPTS);
    assert.equal(row.bodyHtml, null);
    await db.emailLog.update({ where: { id: row.id }, data: { scheduledFor: new Date(0) } });
    assert.equal((await processEmailQueue()).sent, 0);
  });

  test("gives up after the maximum number of attempts", async () => {
    await ctrl(`/fail?code=451&n=${MAX_EMAIL_ATTEMPTS + 2}`);
    const q = await queueEmail(mail());
    const outcomes = [];
    for (let i = 0; i < MAX_EMAIL_ATTEMPTS + 1; i++) {
      await db.emailLog.update({ where: { id: q.id! }, data: { scheduledFor: new Date(0) } });
      outcomes.push(await deliverEmail(q.id!));
    }
    assert.deepEqual(outcomes, ["retry", "retry", "retry", "retry", "failed", "busy"]);
    const row = await db.emailLog.findFirstOrThrow();
    assert.equal(row.attempts, MAX_EMAIL_ATTEMPTS);
    assert.equal(row.bodyHtml, null);
  });

  test("a send stuck mid-flight (crash) is reclaimed after 10 minutes", async () => {
    const q = await queueEmail(mail());
    await db.$executeRaw`UPDATE email_logs SET status = 'SENDING', attempts = 1, updated_at = now() - interval '11 minutes' WHERE id = ${q.id}::uuid`;
    assert.equal((await processEmailQueue()).sent, 1);
  });

  test("without SMTP config emails are logged as skipped, not faked as sent", async () => {
    const host = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;
    try {
      const r = await queueEmail(mail());
      assert.equal(r.status, "skipped");
      const row = await db.emailLog.findFirstOrThrow();
      assert.equal(row.status, "SKIPPED");
      assert.match(row.lastError ?? "", /not configured/);
    } finally {
      process.env.SMTP_HOST = host;
    }
  });

  test("invalid recipients are skipped; header injection is neutralised", async () => {
    assert.equal((await queueEmail(mail({ to: "not-an-email" }))).status, "skipped");
    await sendNow(mail({ subject: "Hi\r\nBcc: victim@example.com", toName: "Eve\r\nBcc: x@example.com" }));
    const [m] = await messages();
    assert.equal(m.headers.bcc, undefined);
    assert.deepEqual(m.to, ["reader@example.com"]);
    assert.match(m.subject, /^Hi Bcc: victim@example\.com$/);
  });
});

describe("application emails", () => {
  test("workflow emails go through the outbox, escaped and branded", async () => {
    const owner = await createUser();
    const org = await createOrganizationWithOwner(db, owner, { name: "Org" });
    await getEmailProvider().sendEmail({
      workspaceId: org.id,
      recipientEmail: "guest@example.com",
      recipientName: "Guest",
      templateType: "registration_confirmation",
      subjectOverride: "You're in: {{webinar_title}}",
      variables: { webinar_title: "Growth <script>alert(1)</script>" },
      bodyHtml: "Hello &lt;b&gt;",
      bodyText: "Hello <b>",
      dedupeKey: "confirm:x",
    });
    const [m] = await messages();
    assert.equal(m.subject, "You're in: Growth <script>alert(1)</script>");
    assert.ok(m.decoded.includes("Webineer"), "branded layout");
    assert.ok(!m.decoded.includes("<script>alert(1)</script></"), "no raw script in HTML part");
    const row = await db.emailLog.findFirstOrThrow();
    assert.equal(row.organizationId, org.id);
    assert.equal(row.template, "registration_confirmation");
  });

  test("standard templates escape variables", async () => {
    await getEmailProvider().sendEmail({ workspaceId: "x", recipientEmail: "a@example.com", recipientName: "A", templateType: "reminder_24h", variables: { first_name: "<img src=x onerror=alert(1)>", webinar_title: "T", webinar_link: "https://e.test" } });
    const [m] = await messages();
    assert.ok(m.decoded.includes("&lt;img src=x onerror=alert(1)&gt;"));
  });

  test("payment receipts: ticket and plan, once per payment", async () => {
    const owner = await createUser("owner@example.com");
    const org = await createOrganizationWithOwner(db, owner, { name: "Org" });
    const sub = await db.subscription.create({ data: { organizationId: org.id, plan: "STARTER", status: "ACTIVE", amount: 19, currency: "USD", provider: "FLUTTERWAVE", currentPeriodEnd: new Date(Date.now() + 30 * 86400e3) } });
    const pay = await db.payment.create({ data: { organizationId: org.id, purpose: "PLATFORM_SUBSCRIPTION", provider: "FLUTTERWAVE", status: "SUCCESSFUL", amount: 19, currency: "USD", txRef: "wbs_r1", idempotencyKey: "i1", customerEmail: "owner@example.com", subscriptionId: sub.id, verifiedAt: new Date(), metadata: { plan: "starter", testMode: true } } });
    await sendPaymentReceipt(pay.id);
    await sendPaymentReceipt(pay.id);
    const msgs = await messages();
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].subject, "Receipt: Webineer Starter Creator");
    assert.ok(msgs[0].decoded.includes("$19.00") && msgs[0].decoded.includes("wbs_r1") && msgs[0].decoded.includes("Test payment"));

    const webinar = await db.webinar.create({ data: { organizationId: org.id, slug: "paid-clinic", publicId: "pub0000000000001", title: "Paid Clinic", status: "SCHEDULED" } });
    const reg = await db.registration.create({ data: { organizationId: org.id, webinarId: webinar.id, email: "buyer@example.com", name: "Buyer Bee", paymentStatus: "PAID" } });
    const tp = await db.payment.create({ data: { organizationId: org.id, purpose: "WEBINAR_TICKET", provider: "FLUTTERWAVE", status: "SUCCESSFUL", amount: 5000, currency: "NGN", txRef: "wbt_r2", idempotencyKey: "i2", customerEmail: "buyer@example.com", customerName: "Buyer Bee", webinarId: webinar.id, registrationId: reg.id, verifiedAt: new Date() } });
    await sendPaymentReceipt(tp.id);
    const [ticket] = (await messages()).filter((m) => m.to.includes("buyer@example.com"));
    assert.equal(ticket.subject, "Payment received: Paid Clinic");
    assert.ok(ticket.decoded.includes("₦5,000.00") || ticket.decoded.includes("5,000.00"));
    assert.ok(ticket.decoded.includes(`https://app.example.test/room/paid-clinic?r=${reg.id}`), "personal join link");
    const row = await db.emailLog.findFirstOrThrow({ where: { template: "payment_receipt" } });
    assert.equal(row.registrationId, reg.id);
  });

  test("pending payments get no receipt", async () => {
    const owner = await createUser();
    const org = await createOrganizationWithOwner(db, owner, { name: "Org" });
    const p = await db.payment.create({ data: { organizationId: org.id, purpose: "PLATFORM_SUBSCRIPTION", provider: "FLUTTERWAVE", status: "PENDING", amount: 19, currency: "USD", txRef: "wbs_p", idempotencyKey: "ip", customerEmail: "o@example.com" } });
    await sendPaymentReceipt(p.id);
    assert.equal((await messages()).length, 0);
  });
});

describe("Supabase send-email hook", () => {
  const key = Buffer.from("0123456789abcdef0123456789abcdef");
  const secretEnv = `v1,whsec_${key.toString("base64")}`;
  const sign = (body: string, id = "msg_1", ts = Math.floor(Date.now() / 1000), k = key) =>
    new Headers({ "webhook-id": id, "webhook-timestamp": String(ts), "webhook-signature": `v1,${createHmac("sha256", k).update(`${id}.${ts}.${body}`).digest("base64")}` });

  test("verifies Standard Webhooks signatures, timestamps and key rotation", () => {
    const secrets = hookSecrets({ SUPABASE_AUTH_HOOK_SECRET: secretEnv });
    const body = '{"a":1}';
    assert.equal(verifyStandardWebhook(body, sign(body), secrets).ok, true);
    assert.equal(verifyStandardWebhook(body + " ", sign(body), secrets).ok, false);
    assert.equal(verifyStandardWebhook(body, sign(body, "msg_1", Math.floor(Date.now() / 1000) - 600), secrets).ok, false);
    assert.equal(verifyStandardWebhook(body, sign(body, "m", undefined, Buffer.from("ffffffffffffffffffffffffffffffff")), secrets).ok, false);
    assert.equal(verifyStandardWebhook(body, new Headers(), secrets).ok, false);
    const rotated = hookSecrets({ SUPABASE_AUTH_HOOK_SECRET: `v1,whsec_${Buffer.from("new-key-new-key-new-key-new-key!").toString("base64")}|${secretEnv}` });
    assert.equal(verifyStandardWebhook(body, sign(body), rotated).ok, true);
  });

  const app = "https://webineer.example.test";
  test("signup and recovery links land on /auth/confirm with a safe next path", () => {
    const [signup] = planAuthEmails({ user: { email: "ada@example.com", user_metadata: { full_name: "Ada" } }, email_data: { email_action_type: "signup", token_hash: "th_1", redirect_to: `${app}/auth/confirm?next=/dashboard` } }, app);
    assert.equal(signup.to, "ada@example.com");
    assert.equal(signup.subject, "Confirm your Webineer account");
    assert.ok(signup.text.includes(`${app}/auth/confirm?token_hash=th_1&type=signup&next=%2Fdashboard`));
    const [recovery] = planAuthEmails({ user: { email: "ada@example.com" }, email_data: { email_action_type: "recovery", token_hash: "th_2", redirect_to: `${app}/auth/confirm?next=/reset-password` } }, app);
    assert.ok(recovery.text.includes("type=recovery&next=%2Freset-password"));
    const [evil] = planAuthEmails({ user: { email: "ada@example.com" }, email_data: { email_action_type: "magiclink", token_hash: "th_3", redirect_to: "https://evil.example/steal" } }, app);
    assert.ok(evil.text.includes("next=%2Fdashboard") && !evil.text.includes("evil.example"));
  });

  test("secure email change sends two emails with the documented hash pairing", () => {
    const planned = planAuthEmails({ user: { email: "old@example.com", new_email: "new@example.com" }, email_data: { email_action_type: "email_change", token_hash: "hash_for_new", token_hash_new: "hash_for_current" } }, app);
    assert.equal(planned.length, 2);
    assert.ok(planned.find((p) => p.to === "old@example.com")!.text.includes("token_hash=hash_for_current"));
    assert.ok(planned.find((p) => p.to === "new@example.com")!.text.includes("token_hash=hash_for_new"));
  });

  test("reauthentication sends the code; notifications go to the right address", () => {
    const [code] = planAuthEmails({ user: { email: "a@example.com" }, email_data: { email_action_type: "reauthentication", token: "482913" } }, app);
    assert.ok(code.html.includes("482913") && !code.text.includes("http"));
    const [notice] = planAuthEmails({ user: { email: "new@example.com" }, email_data: { email_action_type: "email_changed_notification", old_email: "old@example.com" } }, app);
    assert.equal(notice.to, "old@example.com");
  });

  test("auth templates escape and include a text part", () => {
    const e = renderAuthEmail("signup", { link: 'https://x.test/?a="><script>' });
    assert.ok(!e.html.includes('"><script>'));
    assert.ok(e.text.includes("Confirm email: https://x.test/"));
    const r = renderReceipt({ kind: "ticket", name: "<b>Bo</b>", itemTitle: "T", amount: 1234.5, currency: "NGN", reference: "wbt_1", paidAt: new Date() });
    assert.ok(r.html.includes("&lt;b&gt;Bo&lt;/b&gt;") || r.html.includes("Hi &lt;b&gt;Bo&lt;/b&gt;"));
    assert.ok(r.text.includes("₦1,234.50"));
  });
});
