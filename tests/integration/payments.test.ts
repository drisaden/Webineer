import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac } from "node:crypto";
import { createUser, db, resetDatabase } from "./helpers";
import { createOrganizationWithOwner } from "../../src/server/db/organizations";
import * as payments from "../../src/server/payments/service";
import * as flw from "../../src/server/payments/flutterwave";

// Gateway config for this suite (read lazily by the payment modules at call time): a local Flutterwave stand-in (tests/support/fake-flutterwave.mjs).
const PORT = 54411;
process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST-fake-key";
process.env.FLUTTERWAVE_SECRET_HASH = "test-secret-hash-0123456789";
process.env.FLUTTERWAVE_API_BASE = `http://127.0.0.1:${PORT}`;
const FLW = process.env.FLUTTERWAVE_API_BASE;


let fake: ChildProcess;
before(async () => {
  fake = spawn(process.execPath, ["tests/support/fake-flutterwave.mjs"], { env: { ...process.env, FAKE_FLW_PORT: String(PORT) }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`${FLW}/__test/reset`); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error("fake flutterwave did not start");
});
after(async () => { fake?.kill(); await db.$disconnect(); });
beforeEach(async () => { await resetDatabase(); await fetch(`${FLW}/__test/reset`); });

const settle = (txRef: string, q = "") => fetch(`${FLW}/__test/settle?tx_ref=${encodeURIComponent(txRef)}${q}`).then((r) => r.json() as Promise<{ id: number }>);

async function ticketSetup(price = 5000) {
  const owner = await createUser();
  const org = await createOrganizationWithOwner(db, owner, { name: "Org" });
  const webinar = await db.webinar.create({ data: { organizationId: org.id, slug: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, publicId: Math.random().toString(36).slice(2, 18), title: "Paid Clinic", status: "SCHEDULED" } });
  const registration = await db.registration.create({ data: { organizationId: org.id, webinarId: webinar.id, email: `buyer-${Math.random().toString(36).slice(2, 6)}@example.com`, name: "Buyer", paymentStatus: "PENDING" } });
  const start = () => payments.startTicketCheckout({ organizationId: org.id, webinarId: webinar.id, webinarTitle: webinar.title, registrationId: registration.id, email: registration.email, name: registration.name, amount: price, currency: "NGN", origin: "http://localhost:3000" });
  return { org, webinar, registration, start };
}

describe("ticket checkout", () => {
  test("creates a pending payment with a checkout link and logs initialisation", async () => {
    const { start, registration } = await ticketSetup();
    const c = await start();
    assert.match(c.txRef, /^wbt_[0-9a-f]{32}$/);
    assert.match(c.checkoutUrl, /\/checkout\//);
    const p = await db.payment.findUniqueOrThrow({ where: { txRef: c.txRef } });
    assert.equal(p.status, "PENDING");
    assert.equal(p.purpose, "WEBINAR_TICKET");
    assert.equal(Number(p.amount), 5000);
    assert.equal(p.registrationId, registration.id);
    const fakeTx = await (await fetch(`${FLW}/__test/tx?tx_ref=${c.txRef}`)).json();
    assert.equal(fakeTx.redirect_url, `http://localhost:3000/api/public/payments/verify/${registration.id}`);
    assert.ok(await db.paymentEvent.findUnique({ where: { dedupeKey: `init:${c.txRef}` } }));
  });

  test("double-submits reuse one payment (sequential and concurrent)", async () => {
    const { start } = await ticketSetup();
    const results = await Promise.all(Array.from({ length: 6 }, () => start()));
    assert.equal(new Set(results.map((r) => r.txRef)).size, 1);
    assert.equal((await start()).txRef, results[0].txRef);
    assert.equal(await db.payment.count(), 1);
  });

  test("gateway rejection marks the payment failed and surfaces a 502", async () => {
    const { start } = await ticketSetup();
    await fetch(`${FLW}/__test/fail-create?n=1`);
    await assert.rejects(start(), (e: Error & { status?: number }) => e.status === 502);
    assert.equal((await db.payment.findFirstOrThrow()).status, "FAILED");
    // A retry gets a fresh payment.
    const retry = await start();
    assert.equal((await db.payment.findUniqueOrThrow({ where: { txRef: retry.txRef } })).status, "PENDING");
  });

  test("without gateway keys checkout is refused with 503", async () => {
    const { start } = await ticketSetup();
    const key = process.env.FLUTTERWAVE_SECRET_KEY;
    delete process.env.FLUTTERWAVE_SECRET_KEY;
    try {
      await assert.rejects(start(), (e: Error & { status?: number }) => e.status === 503);
    } finally {
      process.env.FLUTTERWAVE_SECRET_KEY = key;
    }
  });
});

describe("confirmation", () => {
  test("successful payment is verified, recorded and unlocks the registration exactly once", async () => {
    const { start, registration } = await ticketSetup();
    const c = await start();
    const tx = await settle(c.txRef);
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) => payments.confirmPayment({ txRef: c.txRef, transactionId: String(tx.id), source: i % 2 ? "webhook" : "redirect" })));
    assert.ok(results.every((r) => r.outcome === "successful"));
    assert.equal(results.filter((r) => r.newlyCompleted).length, 1);
    const p = await db.payment.findUniqueOrThrow({ where: { txRef: c.txRef } });
    assert.equal(p.status, "SUCCESSFUL");
    assert.equal(p.providerTransactionId, String(tx.id));
    assert.ok(p.verifiedAt);
    assert.equal((await db.registration.findUniqueOrThrow({ where: { id: registration.id } })).paymentStatus, "PAID");
    assert.equal(await db.paymentEvent.count({ where: { paymentId: p.id, eventType: "payment.completed" } }), 1);
  });

  test("still-pending checkout is not granted", async () => {
    const { start, registration } = await ticketSetup();
    const c = await start();
    const r = await payments.confirmPayment({ txRef: c.txRef, source: "redirect" });
    assert.equal(r.outcome, "pending");
    assert.equal((await db.registration.findUniqueOrThrow({ where: { id: registration.id } })).paymentStatus, "PENDING");
  });

  test("underpayment is never granted and is held for review", async () => {
    const { start, registration } = await ticketSetup(5000);
    const c = await start();
    const tx = await settle(c.txRef, "&amount=50");
    const r = await payments.confirmPayment({ txRef: c.txRef, transactionId: String(tx.id), source: "redirect" });
    assert.equal(r.outcome, "failed");
    const p = await db.payment.findUniqueOrThrow({ where: { txRef: c.txRef } });
    assert.equal(p.status, "FAILED");
    assert.match(p.failureReason ?? "", /mismatch/);
    assert.equal((await db.registration.findUniqueOrThrow({ where: { id: registration.id } })).paymentStatus, "PENDING");
  });

  test("currency mismatch is rejected", async () => {
    const { start } = await ticketSetup(5000);
    const c = await start();
    const tx = await settle(c.txRef, "&currency=USD");
    assert.equal((await payments.confirmPayment({ txRef: c.txRef, transactionId: String(tx.id), source: "redirect" })).outcome, "failed");
  });

  test("a transaction id belonging to another payment can't unlock this one", async () => {
    const a = await ticketSetup();
    const b = await ticketSetup();
    const ca = await a.start();
    const cb = await b.start();
    const txA = await settle(ca.txRef);
    const r = await payments.confirmPayment({ txRef: cb.txRef, transactionId: String(txA.id), source: "redirect" });
    assert.equal(r.outcome, "pending");
    assert.equal((await db.payment.findUniqueOrThrow({ where: { txRef: cb.txRef } })).status, "PENDING");
    assert.equal((await db.registration.findUniqueOrThrow({ where: { id: b.registration.id } })).paymentStatus, "PENDING");
  });

  test("declined payment marks payment and registration failed", async () => {
    const { start, registration } = await ticketSetup();
    const c = await start();
    const tx = await settle(c.txRef, "&outcome=failed");
    assert.equal((await payments.confirmPayment({ txRef: c.txRef, transactionId: String(tx.id), source: "redirect" })).outcome, "failed");
    assert.equal((await db.payment.findUniqueOrThrow({ where: { txRef: c.txRef } })).status, "FAILED");
    assert.equal((await db.registration.findUniqueOrThrow({ where: { id: registration.id } })).paymentStatus, "FAILED");
  });

  test("transient gateway errors are retried", async () => {
    const { start } = await ticketSetup();
    const c = await start();
    const tx = await settle(c.txRef);
    await fetch(`${FLW}/__test/fail-verify?n=2`);
    const r = await payments.confirmPayment({ txRef: c.txRef, transactionId: String(tx.id), source: "webhook" });
    assert.equal(r.outcome, "successful");
    assert.equal(r.newlyCompleted, true);
  });

  test("a gateway outage leaves the payment pending (webhook will retry)", async () => {
    const { start } = await ticketSetup();
    const c = await start();
    const tx = await settle(c.txRef);
    await fetch(`${FLW}/__test/fail-verify?n=10`);
    assert.equal((await payments.confirmPayment({ txRef: c.txRef, transactionId: String(tx.id), source: "webhook" })).outcome, "pending");
    await fetch(`${FLW}/__test/reset`).catch(() => undefined);
  });

  test("unknown tx_ref", async () => {
    assert.equal((await payments.confirmPayment({ txRef: "wbt_nope", source: "webhook" })).outcome, "unknown");
  });
});

describe("subscriptions", () => {
  async function buy(orgId: string, plan: "starter" | "professional") {
    const c = await payments.startSubscriptionCheckout({ organizationId: orgId, plan, email: "owner@example.com", name: "Owner", origin: "http://localhost:3000" });
    const tx = await settle(c.txRef, `&amount=${plan === "starter" ? 19 : 49}&currency=USD`);
    return payments.confirmPayment({ txRef: c.txRef, transactionId: String(tx.id), source: "redirect" });
  }

  test("buying, extending and switching plans; tickets and subscriptions stay separate", async () => {
    const owner = await createUser();
    const org = await createOrganizationWithOwner(db, owner, { name: "Org" });
    assert.equal((await payments.getEffectivePlan(org.id)).plan, "free");

    const first = await buy(org.id, "starter");
    assert.equal(first.newlyCompleted, true);
    const sub1 = await db.subscription.findFirstOrThrow({ where: { organizationId: org.id, status: "ACTIVE" } });
    assert.equal(sub1.plan, "STARTER");
    const days = (sub1.currentPeriodEnd!.getTime() - Date.now()) / 86400e3;
    assert.ok(days > 29.9 && days <= 30, String(days));
    assert.equal((await db.organization.findUniqueOrThrow({ where: { id: org.id } })).plan, "STARTER");
    assert.equal((await payments.getEffectivePlan(org.id)).plan, "starter");

    await buy(org.id, "starter");
    const extended = await db.subscription.findUniqueOrThrow({ where: { id: sub1.id } });
    assert.ok((extended.currentPeriodEnd!.getTime() - Date.now()) / 86400e3 > 59.9);

    await buy(org.id, "professional");
    assert.equal((await db.subscription.findUniqueOrThrow({ where: { id: sub1.id } })).status, "CANCELLED");
    assert.equal((await payments.getEffectivePlan(org.id)).plan, "professional");
    const subPayments = await db.payment.findMany({ where: { organizationId: org.id } });
    assert.ok(subPayments.every((p) => p.purpose === "PLATFORM_SUBSCRIPTION" && p.registrationId === null && p.subscriptionId));
  });

  test("an expired subscription falls back to Free", async () => {
    const owner = await createUser();
    const org = await createOrganizationWithOwner(db, owner, { name: "Org" });
    await buy(org.id, "starter");
    await db.subscription.updateMany({ where: { organizationId: org.id }, data: { currentPeriodEnd: new Date(Date.now() - 1000) } });
    assert.equal((await payments.getEffectivePlan(org.id)).plan, "free");
  });

  test("free plan can't be bought", async () => {
    await assert.rejects(payments.startSubscriptionCheckout({ organizationId: "00000000-0000-0000-0000-000000000000", plan: "free", email: "x@example.com", name: "", origin: "http://x" }));
  });
});

describe("webhook signature", () => {
  const cfg = () => flw.flutterwaveConfig()!;
  const body = JSON.stringify({ event: "charge.completed", data: { id: 1, tx_ref: "wbt_x", status: "successful" } });
  const secret = process.env.FLUTTERWAVE_SECRET_HASH!;
  test("accepts the dashboard secret hash in verif-hash", () => assert.equal(flw.verifyWebhookSignature(cfg(), body, new Headers({ "verif-hash": secret })), true));
  test("accepts an HMAC-SHA256 hex verif-hash", () => assert.equal(flw.verifyWebhookSignature(cfg(), body, new Headers({ "verif-hash": createHmac("sha256", secret).update(body).digest("hex") })), true));
  test("accepts a base64 flutterwave-signature", () => assert.equal(flw.verifyWebhookSignature(cfg(), body, new Headers({ "flutterwave-signature": createHmac("sha256", secret).update(body).digest("base64") })), true));
  test("rejects wrong / missing signatures", () => {
    assert.equal(flw.verifyWebhookSignature(cfg(), body, new Headers({ "verif-hash": "nope" })), false);
    assert.equal(flw.verifyWebhookSignature(cfg(), body, new Headers()), false);
    assert.equal(flw.verifyWebhookSignature(cfg(), body + " ", new Headers({ "flutterwave-signature": createHmac("sha256", secret).update(body).digest("base64") })), false);
  });
  test("API base override is ignored on Vercel production", () => {
    process.env.VERCEL_ENV = "production";
    try {
      assert.equal(flw.flutterwaveConfig()!.baseUrl, "https://api.flutterwave.com");
    } finally {
      delete process.env.VERCEL_ENV;
    }
  });
});
