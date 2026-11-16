import { escapeHtml } from "@/lib/webinar-workflow/email-render";
import { button, fallbackLink, renderLayout } from "@/server/email/layout";
import { queueAndDeliver, type QueueResult } from "@/server/email/outbox";
import { ticketNumber } from "@/lib/support/types";
import { supportContact } from "./config";

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";
const para = (text: string) => text.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;white-space:pre-line;">${escapeHtml(p)}</p>`).join("");
const quote = (text: string) => `<div style="margin:0 0 18px;padding:12px 16px;border-left:3px solid #16D6B2;background:#F7F9FC;white-space:pre-line;">${escapeHtml(text)}</div>`;

interface TicketRef {
  id: string;
  number: number;
  subject: string;
  requesterName: string;
  requesterEmail: string;
  hasAccount: boolean;
}

/** Confirmation to the customer after an email or callback request (or an offline chat). */
export function sendTicketReceived(t: TicketRef, kind: "EMAIL" | "CALLBACK" | "CHAT", details: { phone?: string | null; window?: string | null; message: string }): Promise<QueueResult> {
  const ref = ticketNumber(t.number);
  const intro =
    kind === "CALLBACK"
      ? `We've got your callback request${details.window ? ` for ${details.window}` : ""}. An agent will call ${details.phone ?? "you"} as soon as one is free.`
      : `Thanks for getting in touch. A member of the team will reply by email${kind === "CHAT" ? " because no agent was online for chat" : ""}.`;
  const link = t.hasAccount ? `${appUrl()}/dashboard/help/tickets/${t.id}` : null;
  const html = renderLayout({
    preheader: `We've received your request (${ref}).`,
    footer: `Reference ${ref}. Reply to this email to add more details.`,
    contentHtml: `<p style="margin:0 0 14px;">Hi ${escapeHtml(firstName(t.requesterName))},</p><p style="margin:0 0 14px;">${escapeHtml(intro)}</p><p style="margin:0 0 6px;font-size:13px;color:#64748B;">Your message (${escapeHtml(ref)}):</p>${quote(details.message)}${link ? button(link, "View your conversation") + fallbackLink(link) : ""}`,
  });
  const text = `Hi ${firstName(t.requesterName)},\n\n${intro}\n\nYour message (${ref}):\n${details.message}\n\n${link ? `View your conversation: ${link}\n\n` : ""}Reply to this email to add more details.`;
  return queueAndDeliver({ template: "support_ticket_received", to: t.requesterEmail, toName: t.requesterName, subject: `We've received your request (${ref})`, html, text, dedupeKey: `support-received:${t.id}` });
}

/** An agent's reply, sent when the customer isn't looking at the chat. */
export function sendAgentReply(t: TicketRef, agentName: string, message: { id: string; body: string }): Promise<QueueResult> {
  const ref = ticketNumber(t.number);
  const link = t.hasAccount ? `${appUrl()}/dashboard/help/tickets/${t.id}` : null;
  const html = renderLayout({
    preheader: message.body.slice(0, 90),
    footer: `Reference ${ref}. Replying to this email reaches the support team.`,
    contentHtml: `<p style="margin:0 0 14px;">Hi ${escapeHtml(firstName(t.requesterName))},</p><p style="margin:0 0 6px;font-size:13px;color:#64748B;">${escapeHtml(agentName)} replied to “${escapeHtml(t.subject)}”:</p>${para(message.body)}${link ? button(link, "Open the conversation") + fallbackLink(link) : ""}`,
  });
  const text = `Hi ${firstName(t.requesterName)},\n\n${agentName} replied to "${t.subject}":\n\n${message.body}\n\n${link ? `Open the conversation: ${link}\n\n` : ""}Reference ${ref}. Replying to this email reaches the support team.`;
  return queueAndDeliver({ template: "support_agent_reply", to: t.requesterEmail, toName: t.requesterName, subject: `Re: ${t.subject} (${ref})`, html, text, dedupeKey: `support-reply:${message.id}` });
}

/** Heads-up to the support inbox about a new ticket or a customer follow-up. */
export async function sendStaffAlert(t: TicketRef, what: "new" | "follow-up", info: { channel: string; message: string; phone?: string | null; window?: string | null; online: boolean }, key: string): Promise<QueueResult | null> {
  const inbox = supportContact().email;
  if (!inbox) return null;
  const ref = ticketNumber(t.number);
  const link = `${appUrl()}/admin/support?ticket=${t.id}`;
  const extra = info.phone ? `Phone: ${info.phone}${info.window ? ` (${info.window})` : ""}\n` : "";
  const html = renderLayout({
    preheader: `${what === "new" ? "New" : "Follow-up on"} ${info.channel.toLowerCase()} request from ${t.requesterName}`,
    footer: "Support desk notification.",
    contentHtml: `<p style="margin:0 0 6px;"><strong>${escapeHtml(ref)}</strong> · ${escapeHtml(info.channel)} · ${what === "new" ? "new" : "follow-up"}${info.online ? "" : " · no agent online"}</p><p style="margin:0 0 14px;">${escapeHtml(t.requesterName)} &lt;${escapeHtml(t.requesterEmail)}&gt;<br>${escapeHtml(t.subject)}</p>${info.phone ? `<p style="margin:0 0 14px;">Phone: <strong>${escapeHtml(info.phone)}</strong>${info.window ? ` (${escapeHtml(info.window)})` : ""}</p>` : ""}${quote(info.message)}${button(link, "Open in the support inbox")}`,
  });
  const text = `${ref} · ${info.channel} · ${what}\n${t.requesterName} <${t.requesterEmail}>\n${t.subject}\n${extra}\n${info.message}\n\n${link}`;
  return queueAndDeliver({ template: "support_staff_alert", to: inbox, subject: `[${ref}] ${what === "new" ? "New" : "Follow-up"}: ${t.subject}`.slice(0, 200), html, text, dedupeKey: key });
}
