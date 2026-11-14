import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP transport (Namecheap cPanel / Private Email or any SMTP server).
 * Credentials come from server environment variables only.
 * TLS is mandatory: implicit TLS on 465, STARTTLS required on 587.
 */
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  replyTo: string | null;
  allowInsecure: boolean;
}

export function smtpConfig(env: Record<string, string | undefined> = process.env): SmtpConfig | null {
  // Vercel's dashboard stores values literally (a .env file strips surrounding quotes, Vercel doesn't),
  // so tolerate values pasted with their .env quotes.
  const clean = (v?: string) => v?.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  const host = clean(env.SMTP_HOST);
  const user = clean(env.SMTP_USER);
  // Only surrounding whitespace / line breaks (copy-paste artifacts) are removed from the password;
  // its characters are otherwise sent exactly as stored.
  const pass = env.SMTP_PASS?.replace(/^\s+|\s+$/g, "");
  const from = clean(env.SMTP_FROM);
  if (!host || !user || !pass || !from) return null;
  const port = Number(env.SMTP_PORT ?? 465) || 465;
  const secure = env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465;
  // Plain-text SMTP is only for local test servers, never on any Vercel deployment.
  const local = host === "127.0.0.1" || host === "localhost";
  const allowInsecure = env.SMTP_ALLOW_INSECURE === "true" && local && !env.VERCEL && !env.VERCEL_ENV;
  return { host, port, secure, user, pass, from, replyTo: clean(env.SMTP_REPLY_TO) || null, allowInsecure };
}

let cached: { key: string; transport: Transporter } | null = null;

function transportFor(cfg: SmtpConfig): Transporter {
  const key = `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}:${cfg.allowInsecure}`;
  if (cached?.key === key) return cached.transport;
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    requireTLS: !cfg.secure && !cfg.allowInsecure,
    ignoreTLS: cfg.allowInsecure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2", servername: cfg.host },
  });
  cached = { key, transport };
  return transport;
}

export interface OutgoingMail {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
  messageKey?: string;
}

/** Strip CR/LF so user-provided values can never inject headers. */
const oneLine = (v: string) => v.replace(/[\r\n]+/g, " ").trim();

export async function sendMail(cfg: SmtpConfig, mail: OutgoingMail): Promise<{ messageId: string | null }> {
  const info = await transportFor(cfg).sendMail({
    from: cfg.from,
    to: mail.toName ? { name: oneLine(mail.toName).slice(0, 120), address: mail.to } : mail.to,
    replyTo: cfg.replyTo ?? undefined,
    subject: oneLine(mail.subject).slice(0, 250),
    html: mail.html,
    text: mail.text,
    headers: { "X-Webineer-Message": mail.messageKey ?? "", "Auto-Submitted": "auto-generated" },
  });
  return { messageId: typeof info.messageId === "string" ? info.messageId : null };
}

/** Recipient-level rejections that retrying will not fix. Auth/connection errors are retried. */
export function isPermanentSmtpError(error: unknown): boolean {
  const code = (error as { responseCode?: number })?.responseCode;
  return typeof code === "number" && [501, 550, 551, 552, 553, 554, 555].includes(code);
}

/**
 * On a rejected login (535 / EAUTH), describe what the server was sent WITHOUT revealing the password:
 * which host/port/user were used and whether the stored password carries typical paste artifacts.
 * This is what separates "wrong value in the environment" from "mail server refuses this client".
 */
export function describeSmtpLogin(cfg: SmtpConfig, env: Record<string, string | undefined> = process.env): string {
  const raw = env.SMTP_PASS ?? "";
  const flags = [
    raw !== raw.trim() ? "had-surrounding-whitespace(trimmed)" : null,
    /^(["']).*\1$/.test(raw.trim()) ? "WRAPPED-IN-QUOTES" : null,
    /\s/.test(raw.trim()) ? "CONTAINS-WHITESPACE" : null,
    /[^\x20-\x7e]/.test(raw.trim()) ? "CONTAINS-NON-ASCII" : null,
    /^SMTP_PASS\s*=/.test(raw.trim()) ? "INCLUDES-VARIABLE-NAME" : null,
  ].filter(Boolean);
  const rawUser = env.SMTP_USER ?? "";
  return [
    `host=${cfg.host}`,
    `port=${cfg.port}`,
    `tls=${cfg.secure ? "implicit" : "starttls"}`,
    `user=${cfg.user}`,
    rawUser !== cfg.user ? "user-had-quotes-or-spaces(cleaned)" : null,
    `secretLength=${cfg.pass.length}`,
    `secretFlags=${flags.length ? flags.join(",") : "none"}`,
  ].filter(Boolean).join(" ");
}

export function isSmtpAuthError(error: unknown): boolean {
  const e = error as { responseCode?: number; code?: string };
  return e?.responseCode === 535 || e?.code === "EAUTH";
}

export function describeSmtpError(error: unknown): string {
  const e = error as { responseCode?: number; code?: string; message?: string; response?: string };
  const parts = [e.responseCode ? String(e.responseCode) : null, e.code ?? null, (e.response ?? e.message ?? "SMTP error").slice(0, 300)];
  // Never echo credentials that a server may reflect back.
  return parts
    .filter(Boolean)
    .join(" ")
    .replace(/\b(pass(word)?|pwd)\s*[=:]\s*\S+/gi, "$1=[redacted]")
    .replace(/[A-Za-z0-9+/]{24,}={0,2}/g, "[redacted]");
}
