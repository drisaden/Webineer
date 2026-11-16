import { createHmac, timingSafeEqual } from "node:crypto";
import { AUTH_ACTIONS, renderAuthEmail, type AuthEmailAction } from "./templates";

/**
 * Supabase Auth "Send Email Hook" support: Standard Webhooks signature verification and
 * mapping of auth email payloads to Webineer emails (links land on /auth/confirm).
 */

const TOLERANCE_SECONDS = 5 * 60;

/** SUPABASE_AUTH_HOOK_SECRET is "v1,whsec_<base64>" (several may be joined with "|" during rotation). */
export function hookSecrets(env: Record<string, string | undefined> = process.env): Buffer[] {
  const raw = env.SUPABASE_AUTH_HOOK_SECRET?.trim();
  if (!raw) return [];
  return raw
    .split("|")
    .map((s) => s.trim().replace(/^v1,/, "").replace(/^whsec_/, ""))
    .filter(Boolean)
    .map((b64) => Buffer.from(b64, "base64"))
    .filter((b) => b.length >= 16);
}

export function verifyStandardWebhook(body: string, headers: Headers, secrets: Buffer[], nowSeconds = Math.floor(Date.now() / 1000)): { ok: true; id: string } | { ok: false; reason: string } {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return { ok: false, reason: "missing headers" };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return { ok: false, reason: "timestamp outside tolerance" };
  const provided = signatureHeader.split(" ").map((p) => p.trim()).filter((p) => p.startsWith("v1,")).map((p) => Buffer.from(p.slice(3)));
  for (const secret of secrets) {
    const expected = Buffer.from(createHmac("sha256", secret).update(`${id}.${timestamp}.${body}`).digest("base64"));
    if (provided.some((sig) => sig.length === expected.length && timingSafeEqual(sig, expected))) return { ok: true, id };
  }
  return { ok: false, reason: "bad signature" };
}

export interface HookPayload {
  user: { id?: string; email?: string; new_email?: string; email_new?: string; user_metadata?: { full_name?: string; name?: string; first_name?: string; workspace_name?: string } };
  email_data: { token?: string; token_hash?: string; redirect_to?: string; email_action_type?: string; site_url?: string; token_new?: string; token_hash_new?: string; old_email?: string };
}

export interface PlannedEmail {
  to: string;
  toName: string | null;
  action: AuthEmailAction | "unknown";
  subject: string;
  html: string;
  text: string;
}

const LINK_TYPES = new Set(["signup", "recovery", "invite", "magiclink", "email", "email_change"]);

/** Only same-site, path-only "next" targets are kept (open-redirect safe; /auth/confirm re-checks). */
function nextPathFrom(redirectTo: string | undefined, appUrl: string): string {
  if (!redirectTo) return "/dashboard";
  try {
    const app = new URL(appUrl);
    const target = new URL(redirectTo, appUrl);
    if (target.origin !== app.origin) return "/dashboard";
    const inner = target.pathname === "/auth/confirm" ? target.searchParams.get("next") : `${target.pathname}${target.search}`;
    return inner && inner.startsWith("/") && !inner.startsWith("//") ? inner : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export function planAuthEmails(payload: HookPayload, appUrl: string): PlannedEmail[] {
  const { user, email_data: d } = payload;
  const type = d.email_action_type ?? "";
  const meta = user.user_metadata ?? {};
  const name = meta.full_name?.trim() || meta.name?.trim() || meta.first_name?.trim() || null;
  const next = nextPathFrom(d.redirect_to, appUrl);
  const link = (hash: string | undefined, linkType: string) =>
    hash ? `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=${encodeURIComponent(linkType)}&next=${encodeURIComponent(next)}` : undefined;
  const make = (to: string | undefined, action: AuthEmailAction, opts: { link?: string; code?: string }): PlannedEmail[] => {
    if (!to) return [];
    const expiresHint = opts.link ? "For your security this link can be used once and expires soon." : undefined;
    return [{ to, toName: name, action, ...renderAuthEmail(action, { ...opts, expiresHint, name, workspaceName: meta.workspace_name }) }];
  };
  const newEmail = user.new_email ?? user.email_new;

  if (type === "email_change") {
    // Historical naming (Supabase docs): token_hash_new pairs with the CURRENT address,
    // token_hash pairs with the NEW address.
    if (d.token_hash && d.token_hash_new) {
      return [...make(user.email, "email_change", { link: link(d.token_hash_new, "email_change") }), ...make(newEmail, "email_change", { link: link(d.token_hash, "email_change") })];
    }
    return make(newEmail ?? user.email, "email_change", { link: link(d.token_hash || d.token_hash_new, "email_change") });
  }
  if (type === "reauthentication") return make(user.email, "reauthentication", { code: d.token });
  if (type === "email_changed_notification") return make(d.old_email || user.email, "email_changed_notification", {});
  if ((AUTH_ACTIONS as string[]).includes(type) && !LINK_TYPES.has(type)) return make(user.email, type as AuthEmailAction, {});
  if (LINK_TYPES.has(type)) return make(user.email, type as AuthEmailAction, { link: link(d.token_hash, type) });
  // A newer action type we don't know yet: still deliver a working link if there is one.
  if (d.token_hash && user.email) return make(user.email, "magiclink", { link: link(d.token_hash, "email") }).map((e) => ({ ...e, action: "unknown" as const, subject: "Your Webineer verification link" }));
  return [];
}
