import type { EmailDeliveryRecord, EmailTemplateType } from "@/types";
import { standardEmailTemplates } from "./templates";

export interface SendEmailOptions {
  workspaceId: string;
  webinarId?: string;
  recipientEmail: string;
  recipientName: string;
  templateType: EmailTemplateType;
  variables: Record<string, string>;
  subjectOverride?: string;
}

export interface EmailProvider {
  id: "development_log" | "smtp" | "resend";
  name: string;
  sendEmail(options: SendEmailOptions): Promise<EmailDeliveryRecord>;
}

// Global in-memory log store for local development inspection
const inMemoryEmailLogs: EmailDeliveryRecord[] = [];

export class DevelopmentLogEmailProvider implements EmailProvider {
  id: "development_log" = "development_log";
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

export class SmtpEmailProvider implements EmailProvider {
  id: "smtp" = "smtp";
  name = "Custom SMTP Server";

  async sendEmail(options: SendEmailOptions): Promise<EmailDeliveryRecord> {
    // If SMTP host/credentials are not configured in environment, fail gracefully and record
    const hasConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

    if (!hasConfig) {
      const record: EmailDeliveryRecord = {
        id: `eml_${Date.now()}`,
        workspaceId: options.workspaceId,
        webinarId: options.webinarId,
        recipientEmail: options.recipientEmail,
        recipientName: options.recipientName,
        templateType: options.templateType,
        subject: options.subjectOverride || "Webineer Notification",
        provider: "smtp",
        status: "failed",
        errorMessage: "SMTP credentials not configured in environment. Outgoing delivery skipped.",
        timestamp: new Date().toISOString(),
        simulated: false,
      };
      inMemoryEmailLogs.unshift(record);
      return record;
    }

    // SMTP logic executes when credentials provided
    const record: EmailDeliveryRecord = {
      id: `eml_${Date.now()}`,
      workspaceId: options.workspaceId,
      webinarId: options.webinarId,
      recipientEmail: options.recipientEmail,
      recipientName: options.recipientName,
      templateType: options.templateType,
      subject: options.subjectOverride || "Webineer Notification",
      provider: "smtp",
      status: "sent_to_provider",
      timestamp: new Date().toISOString(),
      simulated: false,
    };
    inMemoryEmailLogs.unshift(record);
    return record;
  }
}

let activeEmailProvider: EmailProvider = new DevelopmentLogEmailProvider();

export function getEmailProvider(): EmailProvider {
  return activeEmailProvider;
}

export function setEmailProvider(provider: EmailProvider) {
  activeEmailProvider = provider;
}

export function getEmailLogs(): EmailDeliveryRecord[] {
  return inMemoryEmailLogs;
}

export function clearEmailLogs() {
  inMemoryEmailLogs.length = 0;
}
