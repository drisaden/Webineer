/** Shapes and limits shared by the support desk API and UI. */

export const SUPPORT_CATEGORIES = [
  { id: "getting-started", label: "Getting started" },
  { id: "webinars", label: "Creating and running webinars" },
  { id: "emails", label: "Emails and reminders" },
  { id: "billing", label: "Plans and billing" },
  { id: "account", label: "Account and sign-in" },
  { id: "bug", label: "Something isn't working" },
  { id: "other", label: "Something else" },
] as const;
export type SupportCategoryId = (typeof SUPPORT_CATEGORIES)[number]["id"];

export const CALLBACK_WINDOWS = ["As soon as possible", "Morning (9am to 12pm)", "Afternoon (12pm to 4pm)", "Late afternoon (4pm to 6pm)"] as const;

export const SUPPORT_LIMITS = { subject: 120, message: 4000, name: 80, phone: 24, window: 60 } as const;

export type SupportChannelId = "CHAT" | "EMAIL" | "CALLBACK";
export type SupportStatusId = "OPEN" | "PENDING" | "SOLVED";

export interface SupportStatusInfo {
  /** At least one agent is available right now. */
  online: boolean;
  agentsOnline: number;
  hours: string;
  phone: string | null;
  email: string | null;
  /** Signed-in visitors only: tickets with an agent reply they haven't opened. */
  unread: number | null;
}

export interface SupportMessageView {
  id: string;
  seq: number;
  from: "customer" | "agent" | "system";
  name: string;
  body: string;
  at: string;
  internal: boolean;
}

export interface SupportTicketView {
  id: string;
  number: string;
  subject: string;
  category: string;
  channel: SupportChannelId;
  status: SupportStatusId;
  requesterName: string;
  requesterEmail: string;
  phone: string | null;
  callbackWindow: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  lastMessageAt: string;
  unread: boolean;
  preview: string;
}

export interface SupportThreadResponse {
  ticket: SupportTicketView;
  messages: SupportMessageView[];
  agentOnline: boolean;
}

export const ticketNumber = (n: number) => `SUP-${n}`;
