import { formatDateTime, formatDay } from "@/lib/datetime";
import { escapeHtml } from "@/lib/webinar-workflow/email-render";
import { button, fallbackLink, renderLayout } from "./layout";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export type AuthEmailAction =
  | "signup"
  | "recovery"
  | "invite"
  | "magiclink"
  | "email"
  | "email_change"
  | "reauthentication"
  | "password_changed_notification"
  | "email_changed_notification";

const AUTH_COPY: Record<AuthEmailAction, { subject: string; heading: string; intro: string; cta?: string; outro: string }> = {
  signup: { subject: "Confirm your Webineer account", heading: "Confirm your email", intro: "Thanks for signing up for Webineer. Confirm your email address to activate your account.", cta: "Confirm email", outro: "If you didn’t create an account, you can ignore this email." },
  recovery: { subject: "Reset your Webineer password", heading: "Reset your password", intro: "We received a request to reset the password for your Webineer account.", cta: "Choose a new password", outro: "If you didn’t ask for this, you can ignore this email. Your password won’t change." },
  invite: { subject: "You’ve been invited to Webineer", heading: "You’re invited", intro: "You’ve been invited to join a workspace on Webineer. Accept the invitation to set up your account.", cta: "Accept invitation", outro: "If you weren’t expecting this invitation, you can ignore this email." },
  magiclink: { subject: "Your Webineer sign-in link", heading: "Sign in to Webineer", intro: "Use the button below to sign in.", cta: "Sign in", outro: "If you didn’t request this, you can ignore this email." },
  email: { subject: "Your Webineer sign-in link", heading: "Sign in to Webineer", intro: "Use the button below to sign in.", cta: "Sign in", outro: "If you didn’t request this, you can ignore this email." },
  email_change: { subject: "Confirm your email change", heading: "Confirm your email change", intro: "Confirm this change to the email address on your Webineer account.", cta: "Confirm change", outro: "If you didn’t request this change, contact support right away." },
  reauthentication: { subject: "Your Webineer verification code", heading: "Verification code", intro: "Enter this code to confirm it’s you:", outro: "If you didn’t request this, someone may be trying to access your account. Consider changing your password." },
  password_changed_notification: { subject: "Your Webineer password was changed", heading: "Password changed", intro: "The password for your Webineer account was just changed.", outro: "If this wasn’t you, reset your password immediately and contact support." },
  email_changed_notification: { subject: "Your Webineer email address was changed", heading: "Email address changed", intro: "The email address on your Webineer account was just changed.", outro: "If this wasn’t you, contact support immediately." },
};

export const AUTH_ACTIONS = Object.keys(AUTH_COPY) as AuthEmailAction[];

/** First name for greetings: the first word of the saved name, trimmed and capped. Never an email address. */
export function firstNameOf(name: string | null | undefined): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0]?.slice(0, 40) ?? "";
  return first && !first.includes("@") ? first : null;
}

export function renderAuthEmail(action: AuthEmailAction, opts: { link?: string; code?: string; expiresHint?: string; name?: string | null; workspaceName?: string | null }): RenderedEmail {
  const c = AUTH_COPY[action];
  const first = firstNameOf(opts.name);
  const greeting = `Hi ${first ?? "there"},`;
  // Only the sign-up email mentions the workspace, because that is the only one sent before the account is usable.
  const workspace = action === "signup" && opts.workspaceName?.trim() ? opts.workspaceName.trim().slice(0, 80) : null;
  const intro = workspace ? `${c.intro} Your workspace, ${workspace}, will be ready as soon as you do.` : c.intro;
  const subject = first && (action === "signup" || action === "recovery") ? `${first}, ${c.subject.charAt(0).toLowerCase()}${c.subject.slice(1)}` : c.subject;
  const parts = [`<h1 style="margin:0 0 16px;font-size:22px;color:#101B35;">${escapeHtml(c.heading)}</h1>`, `<p>${escapeHtml(greeting)}</p>`, `<p>${escapeHtml(intro)}</p>`];
  const text = [c.heading, "", greeting, "", intro];
  if (opts.code) {
    parts.push(`<p style="font-size:28px;font-weight:bold;letter-spacing:6px;text-align:center;margin:24px 0;">${escapeHtml(opts.code)}</p>`);
    text.push("", opts.code);
  }
  if (c.cta && opts.link) {
    parts.push(button(opts.link, c.cta), fallbackLink(opts.link));
    text.push("", `${c.cta}: ${opts.link}`);
  }
  if (opts.expiresHint) {
    parts.push(`<p style="font-size:13px;color:#64748B;">${escapeHtml(opts.expiresHint)}</p>`);
    text.push("", opts.expiresHint);
  }
  parts.push(`<p style="font-size:13px;color:#64748B;">${escapeHtml(c.outro)}</p>`);
  text.push("", c.outro);
  return { subject, html: renderLayout({ contentHtml: parts.join("\n"), preheader: intro }), text: text.join("\n") };
}

const SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", EUR: "€", GBP: "£" };
const money = (amount: number, currency: string) => `${SYMBOLS[currency] ?? `${currency} `}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function renderReceipt(opts: {
  kind: "ticket" | "subscription";
  name: string;
  itemTitle: string;
  amount: number;
  currency: string;
  reference: string;
  paidAt: Date;
  link?: string;
  linkLabel?: string;
  periodEnd?: Date | null;
  testMode?: boolean;
}): RenderedEmail {
  const date = formatDateTime(opts.paidAt, "Africa/Lagos") + " (WAT)";
  const rows: [string, string][] = [
    [opts.kind === "ticket" ? "Webinar" : "Plan", opts.itemTitle],
    ["Amount", money(opts.amount, opts.currency)],
    ["Reference", opts.reference],
    ["Date", date],
  ];
  if (opts.periodEnd) rows.push(["Active until", formatDay(opts.periodEnd, "Africa/Lagos")]);
  const subject = opts.kind === "ticket" ? `Payment received: ${opts.itemTitle}` : `Receipt: Webineer ${opts.itemTitle}`;
  const intro = opts.kind === "ticket" ? "Thanks — your payment was received and your seat is confirmed." : "Thanks — your payment was received and your plan is active.";
  const first = opts.name.split(/\s+/)[0] || "there";
  const table = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #E4E9F1;border-radius:8px;margin:20px 0;">${rows
    .map(([k, v]) => `<tr><td style="padding:10px 14px;color:#64748B;font-size:13px;border-bottom:1px solid #E4E9F1;">${escapeHtml(k)}</td><td style="padding:10px 14px;font-weight:bold;text-align:right;border-bottom:1px solid #E4E9F1;">${escapeHtml(v)}</td></tr>`)
    .join("")}</table>`;
  const content = [
    `<p>Hi ${escapeHtml(first)},</p>`,
    `<p>${escapeHtml(intro)}</p>`,
    table,
    opts.link && opts.linkLabel ? button(opts.link, opts.linkLabel) : "",
    opts.testMode ? `<p style="font-size:12px;color:#B87514;">Test payment — no real money was charged.</p>` : "",
    `<p style="font-size:13px;color:#64748B;">Payments are processed securely by Flutterwave. Keep this email for your records.</p>`,
  ].join("\n");
  const text = [`Hi ${first},`, "", intro, "", ...rows.map(([k, v]) => `${k}: ${v}`), opts.link ? `\n${opts.linkLabel}: ${opts.link}` : "", opts.testMode ? "\nTest payment — no real money was charged." : ""].join("\n");
  return { subject, html: renderLayout({ contentHtml: content, preheader: intro }), text };
}

/** Sent once when someone confirms their account. Points to the three things that get a first webinar live. */
export function renderWelcome(opts: { name?: string | null; workspaceName?: string | null; dashboardUrl: string; helpUrl: string }): RenderedEmail {
  const first = firstNameOf(opts.name) ?? "there";
  const steps = ["Create your first webinar and choose when it runs.", "Design the registration page people will see.", "Publish it and share the link. Reminders go out automatically."];
  const intro = opts.workspaceName ? `Your workspace “${opts.workspaceName}” is ready.` : "Your workspace is ready.";
  const content = [
    `<p>Hi ${escapeHtml(first)},</p>`,
    `<p>Welcome to Webineer. ${escapeHtml(intro)}</p>`,
    `<p style="margin-bottom:4px;"><strong>Getting started takes three steps:</strong></p>`,
    `<ol style="padding-left:20px;margin-top:0;">${steps.map((s) => `<li style="margin:6px 0;">${escapeHtml(s)}</li>`).join("")}</ol>`,
    button(opts.dashboardUrl, "Open your dashboard"),
    `<p style="font-size:13px;color:#64748B;">Stuck on something? The <a href="${escapeHtml(opts.helpUrl)}" style="color:#0A7F6B;">help center</a> has step-by-step guides, and you can chat with us from your dashboard.</p>`,
  ].join("\n");
  const text = [`Hi ${first},`, "", `Welcome to Webineer. ${intro}`, "", "Getting started takes three steps:", ...steps.map((s, i) => `${i + 1}. ${s}`), "", `Open your dashboard: ${opts.dashboardUrl}`, `Help center: ${opts.helpUrl}`].join("\n");
  return { subject: "Welcome to Webineer", html: renderLayout({ contentHtml: content, preheader: intro }), text };
}

/** Wrap a workflow/system body fragment (already escaped HTML) in the branded layout. */
export function wrapFragment(fragmentHtml: string, preheader?: string, footerHtml?: string): string {
  return renderLayout({ contentHtml: fragmentHtml, preheader, footerHtml });
}
