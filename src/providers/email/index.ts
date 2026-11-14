import type { EmailDeliveryRecord, EmailTemplateType } from "@/types";
import { applyPlaceholders, escapeHtml } from "@/lib/webinar-workflow/email-render";
import { getAuthMode } from "@/lib/supabase/config";
import { standardEmailTemplates } from "./templates";

export interface SendEmailOptions {
  workspaceId: string;
  webinarId?: string;
  recipientEmail: string;
  recipientName: string;
  templateType: EmailTemplateType;
  variables: Record<string, string>;
  subjectOverride?: string;
  /** Optional pre-rendered body (workflow emails). Providers that send real mail should prefer these. */
  bodyText?: string;
  bodyHtml?: string;
  /** Links the log entry to a registration. */
  registrationId?: string;
  /** Same key = same logical email; a second send with the key is dropped (no duplicates). */
  dedupeKey?: string;
}

export interface EmailProvider {
  id: "development_log" | "smtp" | "resend";
  name: string;
  sendEmail(options: SendEmailOptions): Promise<EmailDeliveryRecord>;
}

// Global in-memory log store for local development inspection
const inMemoryEmailLogs: EmailDeliveryRecord[] = [];

export class DevelopmentLogEmailProvider implements EmailProvider {
  id = "development_log" as const;
  name = "Development Log Adapter (Simulated)";

  async sendEmail(options: SendEmailOptions): Promise<EmailDeliveryRecord> {
    const template = standardEmailTemplates.find((t) => t.type === options.templateType) ?? standardEmailTemplates[0];
    let subject = options.subjectOverride || template.subject;
    
    // Replace template variables
    for (const [key, val] of Object.entries(options.variables)) {
      subject = subject.replaceAll(`{{${key}}}`, val);
    }

    const record: EmailDeliveryRecord = {
      id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: options.workspaceId,
      webinarId: options.webinarId,
      recipientEmail: options.recipientEmail,
      recipientName: options.recipientName,
      templateType: options.templateType,
      subject,
      provider: "development_log",
      status: "simulated",
      timestamp: new Date().toISOString(),
      simulated: true,
    };

    inMemoryEmailLogs.unshift(record);
    if (inMemoryEmailLogs.length > 100) inMemoryEmailLogs.pop();

    return record;
  }
}

/** Render a standard template, HTML-escaping variable values (they may contain user input). */
export function renderStandardTemplate(type: EmailTemplateType, variables: Record<string, string>, subjectOverride?: string) {
  const template = standardEmailTemplates.find((t) => t.type === type) ?? standardEmailTemplates[0];
  const escaped = Object.fromEntries(Object.entries(variables).map(([k, v]) => [k, escapeHtml(v)]));
  return {
    subject: applyPlaceholders(subjectOverride || template.subject, variables),
    html: applyPlaceholders(template.bodyHtml, escaped),
    text: applyPlaceholders(template.bodyText, variables),
  };
}

/**
 * Production email: rendered into the branded layout, logged in email_logs (deduplicated),
 * delivered over SMTP after the response is sent, and retried by the cron runner on failure.
 */
export class DatabaseSmtpEmailProvider implements EmailProvider {
  id = "smtp" as const;
  name = "SMTP (database outbox)";

  async sendEmail(options: SendEmailOptions): Promise<EmailDeliveryRecord> {
    const { queueAndDeliver } = await import("@/server/email/outbox");
    const { wrapFragment } = await import("@/server/email/templates");
    const standard = renderStandardTemplate(options.templateType, options.variables, options.subjectOverride);
    const subject = applyPlaceholders(options.subjectOverride || standard.subject, options.variables);
    const fragment = options.bodyHtml ?? (options.bodyText ? escapeHtml(options.bodyText).replace(/\n/g, "<br />") : standard.html);
    const text = options.bodyText ?? standard.text;
    const queued = await queueAndDeliver({
      template: options.templateType,
      to: options.recipientEmail,
      toName: options.recipientName,
      subject,
      html: wrapFragment(fragment, text.split("\n")[0]?.slice(0, 120)),
      text,
      organizationId: options.workspaceId,
      webinarId: options.webinarId,
      registrationId: options.registrationId,
      dedupeKey: options.dedupeKey,
    });
    return {
      id: queued.id ?? `dup_${Date.now()}`,
      workspaceId: options.workspaceId,
      webinarId: options.webinarId,
      recipientEmail: options.recipientEmail,
      recipientName: options.recipientName,
      templateType: options.templateType,
      subject,
      provider: "smtp",
      status: queued.status === "queued" ? "queued" : queued.status === "skipped" ? "failed" : "queued",
      errorMessage: queued.status === "skipped" ? queued.reason : undefined,
      timestamp: new Date().toISOString(),
      simulated: false,
    };
  }
}

let overrideProvider: EmailProvider | null = null;
const devProvider = new DevelopmentLogEmailProvider();
const smtpProvider = new DatabaseSmtpEmailProvider();

/** Demo mode logs emails in memory; every other mode uses the SMTP outbox. */
export function getEmailProvider(): EmailProvider {
  if (overrideProvider) return overrideProvider;
  return getAuthMode() === "demo" ? devProvider : smtpProvider;
}

export function setEmailProvider(provider: EmailProvider | null) {
  overrideProvider = provider;
}

export function getEmailLogs(): EmailDeliveryRecord[] {
  return inMemoryEmailLogs;
}

export function clearEmailLogs() {
  inMemoryEmailLogs.length = 0;
}
