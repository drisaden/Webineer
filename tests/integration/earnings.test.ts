import { after, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createUser, createWebinar, db, resetDatabase } from "./helpers";
import { createOrganizationWithOwner } from "../../src/server/db/organizations";
import * as earnings from "../../src/server/earnings/service";
import { setPlatformSetting, getPlatformFeePercent, feeFor } from "../../src/server/earnings/settings";

beforeEach(resetDatabase);
after(() => db.$disconnect());

const ACCOUNT = { bankName: "GTBank", accountNumber: "0123456789", accountName: "Ada Obi", schedule: "manual" as const, minimumPayout: 0 };

async function setup() {
  const org = await createOrganizationWithOwner(db, await createUser(), { name: "Host" });
  const other = await createOrganizationWithOwner(db, await createUser(), { name: "Other" });
  const w = await createWebinar(org.id, "paid-talk");
  await setPlatformSetting("payout_hold_days", 0, null);
  return { org, other, w };
}

async function sale(orgId: string, webinarId: string, amount: number, appFee: number | null = null) {
  const payment = await db.payment.create({ data: { organizationId: orgId, purpose: "WEBINAR_TICKET", provider: "FLUTTERWAVE", status: "SUCCESSFUL", amount, currency: "NGN", txRef: `wbt_${randomUUID()}`, idempotencyKey: randomUUID(), webinarId, customerEmail: "buyer@example.com", customerName: "Buyer" } });
  await db.$transaction((tx) => earnings.recordSale(tx, payment, appFee));
  return payment;
}

describe("earnings ledger", () => {
  test("a sale keeps 10% for the platform and credits the rest", async () => {
    const { org, w } = await setup();
    await sale(org.id, w.id, 5000, 75);
    const [b] = await earnings.getBalances(org.id);
    assert.equal(b.available, 4500);
    assert.equal(b.platformFees, 500);
    assert.equal(b.lifetimeGross, 5000);
    const entry = await db.ledgerEntry.findFirstOrThrow();
    assert.equal(Number(entry.gatewayFee), 75);
    assert.equal(feeFor(3333.33, 10), 333.33);
  });

  test("money in the hold period is pending, not withdrawable", async () => {
    const { org, w } = await setup();
    await setPlatformSetting("payout_hold_days", 2, null);
    await sale(org.id, w.id, 1000);
    const [b] = await earnings.getBalances(org.id);
    assert.equal(b.available, 0);
    assert.equal(b.pending, 900);
    await earnings.savePayoutAccount(org.id, ACCOUNT);
    await assert.rejects(earnings.requestPayout({ organizationId: org.id, userId: null, amount: 100, currency: "NGN", idempotencyKey: "k1" }), (e: unknown) => e instanceof earnings.EarningsError && e.status === 422);
  });

  test("the fee setting is adjustable and bounded", async () => {
    await setPlatformSetting("platform_fee_percent", 12.5, null);
    assert.equal(await getPlatformFeePercent(), 12.5);
    await assert.rejects(setPlatformSetting("platform_fee_percent", 80, null));
    await assert.rejects(setPlatformSetting("platform_fee_percent", -1, null));
  });

  test("a payment can only be recorded as a sale once", async () => {
    const { org, w } = await setup();
    const p = await sale(org.id, w.id, 1000);
    await assert.rejects(db.$transaction((tx) => earnings.recordSale(tx, p, null)));
    assert.equal(await db.ledgerEntry.count(), 1);
  });

  test("a refund takes the sale back out, once", async () => {
    const { org, w } = await setup();
    const p = await sale(org.id, w.id, 2000);
    await earnings.recordRefund(p.id);
    await earnings.recordRefund(p.id);
    assert.equal((await earnings.getBalances(org.id))[0].available, 0);
    assert.equal(await db.ledgerEntry.count({ where: { type: "REFUND" } }), 1);
  });
});

describe("withdrawals", () => {
  test("need bank details, and can't exceed the available balance", async () => {
    const { org, w } = await setup();
    await sale(org.id, w.id, 10000);
    const ask = (amount: number, key: string) => earnings.requestPayout({ organizationId: org.id, userId: null, amount, currency: "NGN", idempotencyKey: key });
    await assert.rejects(ask(100, "a"), (e: unknown) => e instanceof earnings.EarningsError && e.status === 409);
    await earnings.savePayoutAccount(org.id, { ...ACCOUNT, minimumPayout: 500 });
    await assert.rejects(ask(9000.01, "b"), (e: unknown) => e instanceof earnings.EarningsError && e.status === 422);
    await assert.rejects(ask(100, "c"), (e: unknown) => e instanceof earnings.EarningsError && /minimum/.test(e.message));
    await assert.rejects(ask(-5, "d"));
    await assert.rejects(ask(0, "e"));
    const ok = await ask(9000, "f");
    assert.equal(ok.status, "REQUESTED");
    const [b] = await earnings.getBalances(org.id);
    assert.equal(b.available, 0);
    assert.equal(b.inReview, 9000);
  });

  test("two withdrawals at once can't spend the same money", async () => {
    const { org, w } = await setup();
    await sale(org.id, w.id, 10000);
    await earnings.savePayoutAccount(org.id, ACCOUNT);
    const results = await Promise.allSettled([1, 2, 3, 4].map((i) => earnings.requestPayout({ organizationId: org.id, userId: null, amount: 6000, currency: "NGN", idempotencyKey: `race-${i}` })));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(await db.payoutRequest.count(), 1);
    assert.equal((await earnings.getBalances(org.id))[0].available, 3000);
  });

  test("a double-click with the same key makes one request", async () => {
    const { org, w } = await setup();
    await sale(org.id, w.id, 10000);
    await earnings.savePayoutAccount(org.id, ACCOUNT);
    const rs = await Promise.all([1, 2, 3].map(() => earnings.requestPayout({ organizationId: org.id, userId: null, amount: 1000, currency: "NGN", idempotencyKey: "same" })));
    assert.equal(new Set(rs.map((r) => r.id)).size, 1);
    assert.equal(await db.payoutRequest.count(), 1);
    assert.equal(await db.ledgerEntry.count({ where: { type: "PAYOUT" } }), 1);
  });

  test("bank details are copied onto the request and masked for the host", async () => {
    const { org, w } = await setup();
    await sale(org.id, w.id, 10000);
    await earnings.savePayoutAccount(org.id, ACCOUNT);
    const p = await earnings.requestPayout({ organizationId: org.id, userId: null, amount: 1000, currency: "NGN", idempotencyKey: "snap" });
    await earnings.savePayoutAccount(org.id, { ...ACCOUNT, accountNumber: "9999999999" });
    const row = await db.payoutRequest.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal((row.bankSnapshot as { accountNumber: string }).accountNumber, "0123456789");
    const mine = await earnings.listPayouts(org.id);
    assert.ok(!JSON.stringify(mine).includes("0123456789"));
    assert.match(mine[0].bank, /6789$/);
    assert.ok(!JSON.stringify(await earnings.getPayoutAccount(org.id)).includes("9999999999"));
  });

  test("approve then pay; paid money counts as withdrawn", async () => {
    const { org, w } = await setup();
    await sale(org.id, w.id, 10000);
    await earnings.savePayoutAccount(org.id, ACCOUNT);
    const p = await earnings.requestPayout({ organizationId: org.id, userId: null, amount: 4000, currency: "NGN", idempotencyKey: "pay" });
    await assert.rejects(earnings.markPayoutPaid(p.id, null, "TRF-1"), (e: unknown) => e instanceof earnings.EarningsError && e.status === 409);
    await earnings.approvePayout(p.id, null);
    await assert.rejects(earnings.approvePayout(p.id, null), (e: unknown) => e instanceof earnings.EarningsError && e.status === 409);
    await assert.rejects(earnings.markPayoutPaid(p.id, null, " "));
    await earnings.markPayoutPaid(p.id, null, "TRF-12345");
    const [b] = await earnings.getBalances(org.id);
    assert.equal(b.withdrawn, 4000);
    assert.equal(b.inReview, 0);
    assert.equal(b.available, 5000);
    await assert.rejects(earnings.rejectPayout(p.id, null, "too late"), (e: unknown) => e instanceof earnings.EarningsError && e.status === 409);
  });

  test("declining returns the money, once", async () => {
    const { org, w } = await setup();
    await sale(org.id, w.id, 10000);
    await earnings.savePayoutAccount(org.id, ACCOUNT);
    const p = await earnings.requestPayout({ organizationId: org.id, userId: null, amount: 9000, currency: "NGN", idempotencyKey: "rej" });
    await Promise.allSettled([earnings.rejectPayout(p.id, null, "Name mismatch"), earnings.rejectPayout(p.id, null, "Name mismatch")]);
    assert.equal((await earnings.getBalances(org.id))[0].available, 9000);
    assert.equal(await db.ledgerEntry.count({ where: { type: "PAYOUT_REVERSAL" } }), 1);
    assert.equal((await earnings.listPayouts(org.id))[0].note, "Name mismatch");
  });

  test("the host can cancel only before it is approved, and only their own", async () => {
    const { org, other, w } = await setup();
    await sale(org.id, w.id, 10000);
    await earnings.savePayoutAccount(org.id, ACCOUNT);
    const p = await earnings.requestPayout({ organizationId: org.id, userId: null, amount: 1000, currency: "NGN", idempotencyKey: "cx" });
    await assert.rejects(earnings.cancelPayout(other.id, p.id), (e: unknown) => e instanceof earnings.EarningsError && e.status === 404);
    await earnings.cancelPayout(org.id, p.id);
    assert.equal((await earnings.getBalances(org.id))[0].available, 9000);
    const q = await earnings.requestPayout({ organizationId: org.id, userId: null, amount: 1000, currency: "NGN", idempotencyKey: "cx2" });
    await earnings.approvePayout(q.id, null);
    await assert.rejects(earnings.cancelPayout(org.id, q.id), (e: unknown) => e instanceof earnings.EarningsError && e.status === 409);
  });

  test("a key from another workspace never returns their request", async () => {
    const { org, other, w } = await setup();
    await sale(org.id, w.id, 10000);
    await earnings.savePayoutAccount(org.id, ACCOUNT);
    await earnings.requestPayout({ organizationId: org.id, userId: null, amount: 1000, currency: "NGN", idempotencyKey: "shared" });
    await assert.rejects(earnings.requestPayout({ organizationId: other.id, userId: null, amount: 1000, currency: "NGN", idempotencyKey: "shared" }), (e: unknown) => e instanceof earnings.EarningsError && e.status === 404);
  });
});

describe("reports", () => {
  test("analytics group by webinar and the CSV neutralises spreadsheet formulas", async () => {
    const { org, w } = await setup();
    await sale(org.id, w.id, 1000);
    await sale(org.id, w.id, 2000);
    const a = await earnings.earningsAnalytics(org.id, 7);
    assert.equal(a.series.length, 7);
    assert.equal(a.webinars[0].sales, 2);
    assert.equal(a.webinars[0].net, 2700);
    await db.payment.updateMany({ data: { customerName: "=HYPERLINK(\"http://x\")" } });
    const csv = earnings.transactionsCsv(await earnings.listTransactions(org.id));
    assert.ok(csv.startsWith("Date,Type"));
    assert.ok(!/(^|,)=HYPERLINK/.test(csv) && csv.includes("'=HYPERLINK"));
  });

  test("validation rejects bad bank details", () => {
    assert.ok(earnings.validatePayoutAccount({ ...ACCOUNT, accountNumber: "12345" }));
    assert.ok(earnings.validatePayoutAccount({ ...ACCOUNT, bankName: "" }));
    assert.equal(earnings.validatePayoutAccount(ACCOUNT), null);
    assert.equal(earnings.maskAccount("0123456789"), "•••• 6789");
  });
});
