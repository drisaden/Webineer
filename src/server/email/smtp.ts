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
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS;
  const from = env.SMTP_FROM?.trim();
  if (!host || !user || !pass || !from) return null;
  const port = Number(env.SMTP_PORT ?? 465) || 465;
  const secure = env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465;
  // Plain-text SMTP is only for local test servers, never on any Vercel deployment.
  const local = host === "127.0.0.1" || host === "localhost";
  const allowInsecure = env.SMTP_ALLOW_INSECURE === "true" && local && !env.VERCEL && !env.VERCEL_ENV;
  return { host, port, secure, user, pass, from, replyTo: env.SMTP_REPLY_TO?.trim() || null, allowInsecure };
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

export function describeSmtpError(error: unknown): string {
  const e = error as { responseCode?: number; code?: string; message?: string; response?: string };
  const parts = [e.responseCode ? String(e.responseCode) : null, e.code ?? null, (e.response ?? e.message ?? "SMTP error").slice(0, 300)];
  // Never echo credentials that a server may reflect back.
  return parts.filter(Boolean).join(" ").replace(/(pass(word)?|auth)\S*/gi, "[redacted]");
}
