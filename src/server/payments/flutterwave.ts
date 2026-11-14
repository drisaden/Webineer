import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Flutterwave v3 client (Standard checkout + transaction verification).
 * Server-only: the secret key never reaches the browser.
 *
 * Test vs live is decided by the key itself (FLWSECK_TEST-… keys hit the sandbox).
 */

const DEFAULT_BASE = "https://api.flutterwave.com";
const TIMEOUT_MS = 15_000;

export interface FlutterwaveConfig {
  secretKey: string;
  secretHash: string | null;
  baseUrl: string;
  testMode: boolean;
}

export class FlutterwaveError extends Error {
  constructor(message: string, readonly status?: number, readonly retryable = false) {
    super(message);
  }
}

export function flutterwaveConfig(): FlutterwaveConfig | null {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY?.trim();
  if (!secretKey) return null;
  // The base URL override exists for local integration tests only; it is ignored on every Vercel deployment.
  const override = process.env.FLUTTERWAVE_API_BASE?.trim();
  const baseUrl = override && !process.env.VERCEL && !process.env.VERCEL_ENV ? override.replace(/\/+$/, "") : DEFAULT_BASE;
  return {
    secretKey,
    secretHash: process.env.FLUTTERWAVE_SECRET_HASH?.trim() || null,
    baseUrl,
    testMode: secretKey.startsWith("FLWSECK_TEST"),
  };
}

async function call<T>(cfg: FlutterwaveConfig, path: string, init: { method: "GET" | "POST"; body?: unknown }, attempts = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${cfg.baseUrl}${path}`, {
        method: init.method,
        headers: { Authorization: `Bearer ${cfg.secretKey}`, "Content-Type": "application/json", Accept: "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as { status?: string; message?: string; data?: unknown } | null;
      if (res.status >= 500 || res.status === 429) throw new FlutterwaveError(json?.message ?? `Flutterwave returned ${res.status}`, res.status, true);
      if (!res.ok || !json) throw new FlutterwaveError(json?.message ?? `Flutterwave returned ${res.status}`, res.status);
      return json as T;
    } catch (error) {
      lastError = error;
      const retryable = error instanceof FlutterwaveError ? error.retryable : true; // network errors / timeouts
      if (!retryable || attempt === attempts) break;
      await new Promise((r) => setTimeout(r, 300 * 2 ** (attempt - 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  if (lastError instanceof FlutterwaveError) throw lastError;
  throw new FlutterwaveError(lastError instanceof Error && lastError.name === "AbortError" ? "Flutterwave timed out." : "Couldn't reach Flutterwave.", undefined, true);
}

export interface CheckoutParams {
  txRef: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  customer: { email: string; name?: string };
  title: string;
  description?: string;
  meta?: Record<string, string>;
}

/** Create a hosted checkout link. Not retried: a duplicate tx_ref is rejected by Flutterwave anyway. */
export async function createCheckout(cfg: FlutterwaveConfig, p: CheckoutParams): Promise<string> {
  const res = await call<{ status: string; message?: string; data?: { link?: string } }>(cfg, "/v3/payments", {
    method: "POST",
    body: {
      tx_ref: p.txRef,
      amount: p.amount,
      currency: p.currency,
      redirect_url: p.redirectUrl,
      customer: { email: p.customer.email, name: p.customer.name || undefined },
      customizations: { title: p.title.slice(0, 100), description: p.description?.slice(0, 200) },
      meta: p.meta,
    },
  });
  const link = res.data?.link;
  // Only https checkout links are accepted (plain http only against a local test base URL).
  const linkOk = !!link && (/^https:\/\//.test(link) || (cfg.baseUrl.startsWith("http://127.0.0.1") && link.startsWith("http://127.0.0.1")));
  if (res.status !== "success" || !linkOk) {
    throw new FlutterwaveError(res.message ?? "Flutterwave did not return a checkout link.");
  }
  return link;
}

export interface VerifiedTransaction {
  id: string;
  txRef: string;
  status: string; // "successful" | "failed" | "pending" | …
  amount: number;
  chargedAmount: number;
  currency: string;
  customerEmail: string | null;
  raw: Record<string, unknown>;
}

type VerifyResponse = { status: string; message?: string; data?: Record<string, unknown> };

function toVerified(res: VerifyResponse): VerifiedTransaction | null {
  const d = res.data;
  if (res.status !== "success" || !d) return null;
  const customer = (d.customer ?? {}) as { email?: string };
  return {
    id: String(d.id ?? ""),
    txRef: String(d.tx_ref ?? ""),
    status: String(d.status ?? "").toLowerCase(),
    amount: Number(d.amount ?? 0),
    chargedAmount: Number(d.charged_amount ?? d.amount ?? 0),
    currency: String(d.currency ?? "").toUpperCase(),
    customerEmail: customer.email ?? null,
    // Keep only non-sensitive fields in the stored verification record.
    raw: { id: d.id, tx_ref: d.tx_ref, flw_ref: d.flw_ref, status: d.status, amount: d.amount, charged_amount: d.charged_amount, app_fee: d.app_fee, currency: d.currency, payment_type: d.payment_type, created_at: d.created_at },
  };
}

/** Verify by Flutterwave transaction id (recommended), falling back to our tx_ref. Retried on transient errors. */
export async function verifyTransaction(cfg: FlutterwaveConfig, lookup: { transactionId?: string | null; txRef: string }): Promise<VerifiedTransaction | null> {
  if (lookup.transactionId && /^\d{1,20}$/.test(lookup.transactionId)) {
    try {
      const byId = toVerified(await call<VerifyResponse>(cfg, `/v3/transactions/${lookup.transactionId}/verify`, { method: "GET" }, 3));
      if (byId) return byId;
    } catch (error) {
      if (error instanceof FlutterwaveError && error.retryable) throw error;
      // 4xx (e.g. unknown id): fall back to our own reference below.
    }
  }
  try {
    return toVerified(await call<VerifyResponse>(cfg, `/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(lookup.txRef)}`, { method: "GET" }, 3));
  } catch (error) {
    if (error instanceof FlutterwaveError && !error.retryable) return null; // not found / not paid yet
    throw error;
  }
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Webhook authenticity. Flutterwave sends the dashboard "secret hash" in `verif-hash`;
 * newer deliveries may also sign the raw body (HMAC-SHA256) in `flutterwave-signature`.
 * Either proves knowledge of the secret. Payloads are still re-verified via the API.
 */
export function verifyWebhookSignature(cfg: FlutterwaveConfig, rawBody: string, headers: Headers): boolean {
  if (!cfg.secretHash) return false;
  const verifHash = headers.get("verif-hash");
  if (verifHash) {
    if (safeEqual(verifHash, cfg.secretHash)) return true;
    const hex = createHmac("sha256", cfg.secretHash).update(rawBody).digest("hex");
    if (safeEqual(verifHash, hex)) return true;
  }
  const signature = headers.get("flutterwave-signature");
  if (signature) {
    const b64 = createHmac("sha256", cfg.secretHash).update(rawBody).digest("base64");
    if (safeEqual(signature, b64)) return true;
  }
  return false;
}
