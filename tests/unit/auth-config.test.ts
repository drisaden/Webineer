import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { getAuthMode, getSupabasePublicConfig, safeNextPath, SUPABASE_COOKIE_OPTIONS } from "../../src/lib/supabase/config";

const saved = { ...process.env };
afterEach(() => {
  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_DEMO_MODE", "VERCEL_ENV", "VERCEL"]) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});
const clear = () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_DEMO_MODE;
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL;
};

describe("safeNextPath (open-redirect protection)", () => {
  test("keeps same-site paths with query strings", () => {
    assert.equal(safeNextPath("/dashboard/webinars?tab=past"), "/dashboard/webinars?tab=past");
  });
  for (const bad of ["https://evil.example", "//evil.example/x", "/\\evil.example", "javascript:alert(1)", "", null, undefined, "dashboard"]) {
    test(`rejects ${JSON.stringify(bad)}`, () => assert.equal(safeNextPath(bad as string), "/dashboard"));
  }
});

describe("auth mode", () => {
  test("Supabase mode when URL and publishable key are set", () => {
    clear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co/";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_x";
    assert.equal(getAuthMode(), "supabase");
    assert.equal(getSupabasePublicConfig()?.url, "https://abc.supabase.co");
  });
  test("legacy anon key is accepted", () => {
    clear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJ...";
    assert.equal(getAuthMode(), "supabase");
  });
  test("demo mode only when explicitly enabled", () => {
    clear();
    assert.equal(getAuthMode(), "unconfigured");
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    assert.equal(getAuthMode(), "demo");
  });
  test("demo mode can never activate on any Vercel deployment (production or preview)", () => {
    for (const env of [{ VERCEL_ENV: "production" }, { VERCEL_ENV: "preview" }, { VERCEL: "1" }]) {
      clear();
      process.env.NEXT_PUBLIC_DEMO_MODE = "true";
      Object.assign(process.env, env);
      assert.equal(getAuthMode(), "unconfigured", JSON.stringify(env));
    }
  });
});

test("session cookies are HttpOnly and SameSite=Lax", () => {
  assert.equal(SUPABASE_COOKIE_OPTIONS.httpOnly, true);
  assert.equal(SUPABASE_COOKIE_OPTIONS.sameSite, "lax");
});
