import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CODE_ALPHABET, CODE_LENGTH, generateCode, isValidCode, shortHost, shortUrl } from "../../src/lib/short-links/code";

describe("short link codes", () => {
  test("codes are the right length, readable and not repeated", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const code = generateCode();
      assert.equal(code.length, CODE_LENGTH);
      assert.ok([...code].every((c) => CODE_ALPHABET.includes(c)));
      seen.add(code);
    }
    assert.ok(seen.size > 495);
    assert.ok(!/[0oil1]/.test(CODE_ALPHABET));
  });
  test("shape check rejects anything that is not a plain code", () => {
    for (const ok of ["abc2345", "zzzz", "a".repeat(16)]) assert.ok(isValidCode(ok), ok);
    for (const bad of ["", "abc", "ABC2345", "ab c234", "../etc", "a".repeat(17), "abc2345;drop"]) assert.ok(!isValidCode(bad), bad);
  });
  test("the short domain comes from SHORT_LINK_BASE_URL, then the app address", () => {
    assert.equal(shortUrl("abc2345", { SHORT_LINK_BASE_URL: "https://w.ta/", NEXT_PUBLIC_APP_URL: "https://app.example.com" }), "https://w.ta/abc2345");
    assert.equal(shortUrl("abc2345", { NEXT_PUBLIC_APP_URL: "https://app.example.com/" }), "https://app.example.com/s/abc2345");
    assert.equal(shortUrl("abc2345", { SHORT_LINK_BASE_URL: "javascript:alert(1)", NEXT_PUBLIC_APP_URL: "https://app.example.com" }), "https://app.example.com/s/abc2345", "unsafe values are ignored");
    assert.equal(shortUrl("abc2345", {}), "http://localhost:3000/s/abc2345");
  });
  test("the short host is read from SHORT_LINK_BASE_URL", () => {
    assert.equal(shortHost({ SHORT_LINK_BASE_URL: "https://W.TechraAcademy.com/" }), "w.techraacademy.com");
    assert.equal(shortHost({ NEXT_PUBLIC_APP_URL: "https://app.example.com" }), null);
    assert.equal(shortHost({ SHORT_LINK_BASE_URL: "nonsense" }), null);
  });
});
