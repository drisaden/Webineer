import { test } from "node:test";
import assert from "node:assert/strict";
import { currencyForCountry } from "../../src/lib/currency/country";

test("hosts are priced in their own country's currency", () => {
  assert.equal(currencyForCountry("NG"), "NGN");
  assert.equal(currencyForCountry("ng"), "NGN");
  assert.equal(currencyForCountry("GB"), "GBP");
  assert.equal(currencyForCountry("DE"), "EUR");
  assert.equal(currencyForCountry("US"), "USD");
  assert.equal(currencyForCountry("GH"), "USD");
  assert.equal(currencyForCountry(null), "USD");
  assert.equal(currencyForCountry(""), "USD");
});
