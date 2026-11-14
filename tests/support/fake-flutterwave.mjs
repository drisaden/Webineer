// Local stand-in for the Flutterwave v3 API (Standard checkout + verify). Test use only.
// Port: FAKE_FLW_PORT (default 54400). Secret key must be FLWSECK_TEST-fake-key.
import http from "node:http";

const PORT = Number(process.env.FAKE_FLW_PORT ?? 54400);
const KEY = process.env.FAKE_FLW_KEY ?? "FLWSECK_TEST-fake-key";
const txs = new Map(); // tx_ref -> tx
const byId = new Map(); // id -> tx_ref
let nextId = 9_000_001;
let failVerify = 0; // respond 500 to the next N verify calls
let failCreate = 0;

const send = (res, code, body, headers = {}) => {
  res.writeHead(code, { "Content-Type": "application/json", ...headers });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};
const readBody = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(b)); });
const view = (t) => ({ id: t.id, tx_ref: t.tx_ref, flw_ref: `FLW-MOCK-${t.id}`, status: t.status, amount: t.paidAmount ?? t.amount, charged_amount: t.paidAmount ?? t.amount, app_fee: 1.4, currency: t.paidCurrency ?? t.currency, payment_type: "card", created_at: t.created_at, customer: { email: t.customer?.email, name: t.customer?.name } });

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const authed = req.headers.authorization === `Bearer ${KEY}`;

  if (url.pathname === "/__test/reset") { txs.clear(); byId.clear(); failVerify = 0; failCreate = 0; return send(res, 200, { ok: true }); }
  if (url.pathname === "/__test/fail-verify") { failVerify = Number(url.searchParams.get("n") ?? 1); return send(res, 200, { ok: true }); }
  if (url.pathname === "/__test/fail-create") { failCreate = Number(url.searchParams.get("n") ?? 1); return send(res, 200, { ok: true }); }
  if (url.pathname === "/__test/tx") return send(res, 200, txs.get(url.searchParams.get("tx_ref")) ?? null);
  if (url.pathname === "/__test/list") return send(res, 200, [...txs.values()]);
  // Settle a transaction without the browser redirect (e.g. buyer closed the tab).
  if (url.pathname === "/__test/settle") {
    const t = txs.get(url.searchParams.get("tx_ref"));
    if (!t) return send(res, 404, { error: "unknown" });
    t.status = url.searchParams.get("outcome") ?? "successful";
    if (url.searchParams.get("amount")) t.paidAmount = Number(url.searchParams.get("amount"));
    if (url.searchParams.get("currency")) t.paidCurrency = url.searchParams.get("currency");
    return send(res, 200, view(t));
  }

  // Hosted checkout page: settles and redirects back like Flutterwave does.
  if (url.pathname.startsWith("/checkout/")) {
    const t = txs.get(decodeURIComponent(url.pathname.slice("/checkout/".length)));
    if (!t) return send(res, 404, { error: "unknown checkout" });
    const outcome = url.searchParams.get("outcome") ?? "successful";
    if (outcome !== "abandon") {
      t.status = outcome;
      if (url.searchParams.get("amount")) t.paidAmount = Number(url.searchParams.get("amount"));
      if (url.searchParams.get("currency")) t.paidCurrency = url.searchParams.get("currency");
    }
    const back = new URL(t.redirect_url);
    back.searchParams.set("status", outcome === "abandon" ? "cancelled" : outcome);
    back.searchParams.set("tx_ref", t.tx_ref);
    back.searchParams.set("transaction_id", String(t.id));
    res.writeHead(302, { Location: back.toString() });
    return res.end();
  }

  if (!url.pathname.startsWith("/v3/")) return send(res, 404, { status: "error", message: "not found" });
  if (!authed) return send(res, 401, { status: "error", message: "Invalid authorization key" });

  if (req.method === "POST" && url.pathname === "/v3/payments") {
    if (failCreate > 0) { failCreate--; return send(res, 400, { status: "error", message: "Merchant not enabled for currency" }); }
    const body = JSON.parse((await readBody(req)) || "{}");
    if (!body.tx_ref || !(body.amount > 0) || !body.currency || !body.redirect_url || !body.customer?.email) return send(res, 400, { status: "error", message: "Invalid payload" });
    if (txs.has(body.tx_ref)) return send(res, 400, { status: "error", message: "Duplicate tx_ref" });
    const t = { ...body, id: nextId++, status: "pending", created_at: new Date().toISOString() };
    txs.set(t.tx_ref, t); byId.set(String(t.id), t.tx_ref);
    return send(res, 200, { status: "success", message: "Hosted Link", data: { link: `http://127.0.0.1:${PORT}/checkout/${encodeURIComponent(t.tx_ref)}` } });
  }

  const verifyMatch = url.pathname.match(/^\/v3\/transactions\/(\d+)\/verify$/);
  if (req.method === "GET" && (verifyMatch || url.pathname === "/v3/transactions/verify_by_reference")) {
    if (failVerify > 0) { failVerify--; return send(res, 503, { status: "error", message: "Service unavailable" }); }
    const ref = verifyMatch ? byId.get(verifyMatch[1]) : url.searchParams.get("tx_ref");
    const t = ref ? txs.get(ref) : undefined;
    if (!t) return send(res, 400, { status: "error", message: "No transaction was found for this id" });
    // Like Flutterwave, an unpaid checkout has no transaction record to verify yet.
    if (t.status === "pending") return send(res, 400, { status: "error", message: "No transaction was found" });
    return send(res, 200, { status: "success", message: "Transaction fetched successfully", data: view(t) });
  }
  return send(res, 404, { status: "error", message: "not found" });
}).listen(PORT, "127.0.0.1", () => console.log(`fake flutterwave on ${PORT}`));
