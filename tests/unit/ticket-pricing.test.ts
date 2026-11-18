import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PricingError, lowestPrice, resolveTicketPrice, validateTicketSettings, type TicketPaymentSettings } from "../../src/lib/pricing/ticket";

const flat: TicketPaymentSettings = { enabled: true, price: 5000, currency: "NGN" };
const tiered: TicketPaymentSettings = {
  enabled: true, price: 0, currency: "NGN",
  tiers: [{ id: "std", name: "Standard", price: 5000, description: "" }, { id: "vip", name: "VIP", price: 15000, description: "" }, { id: "free", name: "Audience", price: 0, description: "" }],
  discountCodes: [
    { code: "TEN", percentOff: 10, maxUses: null, expiresAt: null, active: true },
    { code: "OFF2000", amountOff: 2000, maxUses: 2, expiresAt: null, active: true },
    { code: "FREE", percentOff: 100, maxUses: null, expiresAt: null, active: true },
    { code: "OLD", percentOff: 50, maxUses: null, expiresAt: "2026-01-31", active: true },
    { code: "OFF", percentOff: 50, maxUses: null, expiresAt: null, active: false },
    { code: "HUGE", amountOff: 999999, maxUses: null, expiresAt: null, active: true },
  ],
};
const none = () => 0;
const err = (fn: () => unknown) => { try { fn(); } catch (e) { return e as PricingError; } return null; };

describe("ticket prices", () => {
  test("a single price works with no choices", () => {
    const r = resolveTicketPrice(flat, {}, none);
    assert.deepEqual([r.amount, r.tier, r.code], [5000, null, null]);
  });
  test("with tiers a ticket must be chosen, and unknown ids are refused", () => {
    assert.equal(err(() => resolveTicketPrice(tiered, {}, none))?.field, "tier");
    assert.equal(err(() => resolveTicketPrice(tiered, { tierId: "gold" }, none))?.field, "tier");
    assert.equal(resolveTicketPrice(tiered, { tierId: "vip" }, none).amount, 15000);
    assert.equal(resolveTicketPrice(tiered, { tierId: "free" }, none).amount, 0);
  });
  test("a client can't set its own price", () => {
    assert.equal(resolveTicketPrice(tiered, { tierId: "std", ...( { price: 1 } as object) } as never, none).amount, 5000);
  });
  test("percentage and fixed discounts, rounded to two places", () => {
    assert.equal(resolveTicketPrice(tiered, { tierId: "vip", code: "ten" }, none).amount, 13500);
    assert.equal(resolveTicketPrice(tiered, { tierId: "vip", code: " off2000 " }, none).amount, 13000);
    assert.equal(resolveTicketPrice({ ...flat, price: 3333.33, discountCodes: tiered.discountCodes }, { code: "TEN" }, none).amount, 3000);
    const r = resolveTicketPrice(tiered, { tierId: "std", code: "TEN" }, none);
    assert.deepEqual([r.base, r.discount, r.code], [5000, 500, "TEN"]);
  });
  test("a discount can take the price to zero but never below", () => {
    assert.equal(resolveTicketPrice(tiered, { tierId: "std", code: "FREE" }, none).amount, 0);
    assert.equal(resolveTicketPrice(tiered, { tierId: "std", code: "HUGE" }, none).amount, 0);
    assert.equal(resolveTicketPrice(tiered, { tierId: "free", code: "TEN" }, none).amount, 0);
  });
  test("wrong, expired, switched-off and used-up codes all look the same", () => {
    const now = new Date("2026-11-18T10:00:00Z");
    const messages = ["NOPE", "OLD", "OFF"].map((code) => err(() => resolveTicketPrice(tiered, { tierId: "std", code }, none, now))?.message);
    assert.deepEqual(messages, ["That code isn't valid.", "That code isn't valid.", "That code isn't valid."]);
    assert.equal(err(() => resolveTicketPrice(tiered, { tierId: "std", code: "OFF2000" }, () => 2, now))?.field, "code");
    assert.equal(resolveTicketPrice(tiered, { tierId: "std", code: "OFF2000" }, () => 1, now).amount, 3000);
  });
  test("a code works until the end of its last day", () => {
    const c: TicketPaymentSettings = { ...flat, discountCodes: [{ code: "LAST", percentOff: 50, maxUses: null, expiresAt: "2026-11-18", active: true }] };
    assert.equal(resolveTicketPrice(c, { code: "LAST" }, none, new Date("2026-11-18T23:00:00Z")).amount, 2500);
    assert.equal(err(() => resolveTicketPrice(c, { code: "LAST" }, none, new Date("2026-11-19T00:30:00Z")))?.field, "code");
  });
  test("free webinars ignore tiers and codes", () => {
    assert.equal(resolveTicketPrice({ enabled: false, price: 0, currency: "NGN" }, { code: "TEN" }, none).amount, 0);
  });
  test("lowest price is shown as 'from'", () => {
    assert.equal(lowestPrice(tiered), 0);
    assert.equal(lowestPrice({ ...tiered, tiers: tiered.tiers!.slice(0, 2) }), 5000);
    assert.equal(lowestPrice(flat), 5000);
  });
});

describe("host settings validation", () => {
  test("accepts good settings", () => assert.deepEqual(validateTicketSettings(tiered), []));
  test("catches bad tiers and codes in plain words", () => {
    const bad: TicketPaymentSettings = { ...tiered, tiers: [{ id: "a", name: " ", price: -1, description: "" }], discountCodes: [
      { code: "x", percentOff: 10, maxUses: null, expiresAt: null, active: true },
      { code: "BOTH", percentOff: 10, amountOff: 5, maxUses: null, expiresAt: null, active: true },
      { code: "OVER", percentOff: 150, maxUses: null, expiresAt: null, active: true },
      { code: "ZERO", maxUses: 0, expiresAt: null, active: true },
      { code: "TEN", percentOff: 10, maxUses: null, expiresAt: null, active: true },
      { code: "TEN", percentOff: 10, maxUses: null, expiresAt: null, active: true },
    ] };
    const text = validateTicketSettings(bad).join(" | ");
    for (const part of ["Give ticket option 1 a name", "price of 0 or more", "isn't a valid code", "either a percentage or an amount", "between 1 and 100", "whole number above 0", "listed twice"]) assert.ok(text.includes(part), part);
  });
  test("limits the number of options and codes", () => {
    const many: TicketPaymentSettings = { ...flat, tiers: Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, name: "n", price: 1, description: "" })) };
    assert.ok(validateTicketSettings(many).some((m) => m.includes("at most 5")));
  });
});
