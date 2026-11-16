import type { Prisma } from "@/generated/prisma/client";
import { CALLBACK_WINDOWS, SUPPORT_CATEGORIES, SUPPORT_LIMITS, ticketNumber, type SupportMessageView, type SupportStatusInfo, type SupportThreadResponse, type SupportTicketView, type SupportChannelId, type SupportStatusId } from "@/lib/support/types";
import { cleanText } from "@/lib/live/text";
import { getPrisma } from "@/server/db/prisma";
import { supportContact } from "./config";
import { sendAgentReply, sendStaffAlert, sendTicketReceived } from "./emails";

export class SupportError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export const AGENT_ONLINE_MS = 90_000;
/** A customer who opened the thread this recently is watching it, so a reply doesn't need an email. */
export const WATCHING_MS = 3 * 60_000;
const MAX_OPEN_TICKETS = 5;
const MAX_TICKETS_PER_DAY = 10;

/** Support messages keep paragraph breaks, unlike chat which is single-line. */
export function cleanMessage(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

export function validPhone(input: string): boolean {
  if (!/^\+?[0-9 ()\-]{7,24}$/.test(input)) return false;
  const digits = input.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

const validEmail = (e: string) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e) && e.length <= 254;

type TicketRow = Prisma.SupportTicketGetPayload<{ include: { assignee: { select: { name: true } } } }>;

function view(t: TicketRow, extras: { unread?: boolean; preview?: string } = {}): SupportTicketView {
  return {
    id: t.id,
    number: ticketNumber(t.number),
    subject: t.subject,
    category: t.category,
    channel: t.channel,
    status: t.status,
    requesterName: t.requesterName,
    requesterEmail: t.requesterEmail,
    phone: t.phone,
    callbackWindow: t.callbackWindow,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee?.name ? t.assignee.name.split(" ")[0] : null,
    createdAt: t.createdAt.toISOString(),
    lastMessageAt: t.lastMessageAt.toISOString(),
    unread: extras.unread ?? false,
    preview: extras.preview ?? "",
  };
}

function messageView(m: { id: string; seq: number; authorType: "CUSTOMER" | "AGENT" | "SYSTEM"; authorName: string; body: string; createdAt: Date; internal: boolean }): SupportMessageView {
  return { id: m.id, seq: m.seq, from: m.authorType.toLowerCase() as SupportMessageView["from"], name: m.authorName, body: m.body, at: m.createdAt.toISOString(), internal: m.internal };
}

const withAssignee = { assignee: { select: { name: true } } } as const;

export async function onlineAgentCount(now = new Date()): Promise<number> {
  return getPrisma().supportAgent.count({ where: { available: true, lastSeenAt: { gt: new Date(now.getTime() - AGENT_ONLINE_MS) } } });
}

export async function supportStatus(userId: string | null, now = new Date()): Promise<SupportStatusInfo> {
  const contact = supportContact();
  const agentsOnline = await onlineAgentCount(now);
  return { online: agentsOnline > 0, agentsOnline, hours: contact.hours, phone: contact.phone, email: contact.email, unread: userId ? await unreadCount(userId) : null };
}

// ───────────────────────── Customers ─────────────────────────

export interface Requester {
  id: string | null;
  name: string;
  email: string;
  organizationId?: string | null;
}

export interface NewTicketInput {
  channel: SupportChannelId;
  subject?: string;
  category?: string;
  message: string;
  phone?: string;
  callbackWindow?: string;
}

/** Opens a ticket, or for chat adds to the customer's open chat if they already have one. */
export async function createTicket(requester: Requester, input: NewTicketInput, now = new Date()): Promise<{ ticket: SupportTicketView; created: boolean; emailed: boolean }> {
  const db = getPrisma();
  const name = cleanText(requester.name, SUPPORT_LIMITS.name) || "Customer";
  const email = requester.email.trim().toLowerCase();
  if (!validEmail(email)) throw new SupportError("Enter a valid email address.");
  const message = cleanMessage(input.message, SUPPORT_LIMITS.message);
  if (!message) throw new SupportError("Tell us how we can help.");
  const category = SUPPORT_CATEGORIES.some((c) => c.id === input.category) ? (input.category as string) : "other";
  let subject = cleanText(input.subject ?? "", SUPPORT_LIMITS.subject);
  if (!subject) subject = input.channel === "CALLBACK" ? "Callback request" : cleanText(message, 70) || "Chat";
  let phone: string | null = null;
  let callbackWindow: string | null = null;
  if (input.channel === "CALLBACK") {
    phone = cleanText(input.phone ?? "", SUPPORT_LIMITS.phone);
    if (!validPhone(phone)) throw new SupportError("Enter a phone number we can call, including the country code.");
    callbackWindow = (CALLBACK_WINDOWS as readonly string[]).includes(input.callbackWindow ?? "") ? (input.callbackWindow as string) : CALLBACK_WINDOWS[0];
  }

  if (input.channel === "CHAT" && requester.id) {
    const existing = await db.supportTicket.findFirst({ where: { requesterId: requester.id, channel: "CHAT", status: { not: "SOLVED" } }, include: withAssignee, orderBy: { lastMessageAt: "desc" } });
    if (existing) {
      await customerReply(requester.id, existing.id, message, now);
      return { ticket: view((await db.supportTicket.findUniqueOrThrow({ where: { id: existing.id }, include: withAssignee }))), created: false, emailed: false };
    }
  }

  if (requester.id) {
    const [open, today] = await Promise.all([
      db.supportTicket.count({ where: { requesterId: requester.id, status: { not: "SOLVED" } } }),
      db.supportTicket.count({ where: { requesterId: requester.id, createdAt: { gt: new Date(now.getTime() - 24 * 3_600_000) } } }),
    ]);
    if (open >= MAX_OPEN_TICKETS) throw new SupportError(`You already have ${MAX_OPEN_TICKETS} open requests. Please add to one of those, or mark one as solved, before opening another.`, 429);
    if (today >= MAX_TICKETS_PER_DAY) throw new SupportError("You've opened a lot of requests today. Please add to an existing one and we'll get back to you.", 429);
  }

  const row = await db.supportTicket.create({
    data: {
      organizationId: requester.organizationId ?? null,
      requesterId: requester.id,
      requesterName: name,
      requesterEmail: email,
      subject,
      category,
      channel: input.channel,
      phone,
      callbackWindow,
      createdAt: now,
      lastMessageAt: now,
      customerSeenAt: requester.id ? now : null,
      messages: { create: { authorType: "CUSTOMER", authorUserId: requester.id, authorName: name, body: message, createdAt: now } },
    },
    include: withAssignee,
  });

  const online = (await onlineAgentCount(now)) > 0;
  const ref = { id: row.id, number: row.number, subject: row.subject, requesterName: name, requesterEmail: email, hasAccount: Boolean(requester.id) };
  let emailed = false;
  try {
    // Chat with an agent online needs no email. Everything else gets a receipt so the customer has the reference.
    if (input.channel !== "CHAT" || !online) {
      const receipt = await sendTicketReceived(ref, input.channel, { phone, window: callbackWindow, message });
      emailed = receipt.status === "queued" || receipt.status === "duplicate";
    }
    if (input.channel !== "CHAT" || !online) await sendStaffAlert(ref, "new", { channel: input.channel, message, phone, window: callbackWindow, online }, `support-staff:new:${row.id}`);
  } catch (error) {
    console.error("[support] notification email failed", error instanceof Error ? error.message : error);
  }
  return { ticket: view(row), created: true, emailed };
}

async function ownTicket(userId: string, id: string) {
  const ticket = await getPrisma().supportTicket.findFirst({ where: { id, requesterId: userId }, include: withAssignee });
  if (!ticket) throw new SupportError("Conversation not found.", 404);
  return ticket;
}

export async function listMyTickets(userId: string): Promise<SupportTicketView[]> {
  const rows = await getPrisma().supportTicket.findMany({
    where: { requesterId: userId },
    include: { ...withAssignee, messages: { where: { internal: false }, orderBy: { seq: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });
  return rows.map((t) => {
    const last = t.messages[0];
    const unread = Boolean(last && last.authorType === "AGENT" && last.createdAt > (t.customerSeenAt ?? t.createdAt));
    return view(t, { unread, preview: last?.body.slice(0, 120) ?? "" });
  });
}

/** Customer's view of a thread: no internal notes. Opening it marks the agent's replies as read. */
export async function getMyThread(userId: string, id: string, after = 0, now = new Date()): Promise<SupportThreadResponse> {
  const db = getPrisma();
  const ticket = await ownTicket(userId, id);
  const [messages] = await Promise.all([
    db.supportMessage.findMany({ where: { ticketId: id, internal: false, seq: { gt: after } }, orderBy: { seq: "asc" }, take: 200 }),
    db.supportTicket.update({ where: { id }, data: { customerSeenAt: now }, select: { id: true } }),
  ]);
  return { ticket: view(ticket), messages: messages.map(messageView), agentOnline: (await onlineAgentCount(now)) > 0 };
}

export async function customerReply(userId: string, id: string, body: string, now = new Date()): Promise<SupportMessageView> {
  const db = getPrisma();
  const ticket = await ownTicket(userId, id);
  const text = cleanMessage(body, SUPPORT_LIMITS.message);
  if (!text) throw new SupportError("Write a message first.");
  const [message] = await db.$transaction([
    db.supportMessage.create({ data: { ticketId: id, authorType: "CUSTOMER", authorUserId: userId, authorName: cleanText(ticket.requesterName, SUPPORT_LIMITS.name), body: text, createdAt: now } }),
    db.supportTicket.update({ where: { id }, data: { status: "OPEN", solvedAt: null, lastMessageAt: now, customerSeenAt: now } }),
  ]);
  // A reply on a quiet email or callback ticket should reach staff. Live chat is watched in the inbox.
  if (ticket.channel !== "CHAT" || (await onlineAgentCount(now)) === 0) {
    const bucket = Math.floor(now.getTime() / (15 * 60_000));
    try {
      await sendStaffAlert({ id, number: ticket.number, subject: ticket.subject, requesterName: ticket.requesterName, requesterEmail: ticket.requesterEmail, hasAccount: true }, "follow-up", { channel: ticket.channel, message: text, online: (await onlineAgentCount(now)) > 0 }, `support-staff:follow:${id}:${bucket}`);
    } catch (error) {
      console.error("[support] staff alert failed", error instanceof Error ? error.message : error);
    }
  }
  return messageView(message);
}

export async function customerSolve(userId: string, id: string, now = new Date()) {
  await ownTicket(userId, id);
  await getPrisma().supportTicket.update({ where: { id }, data: { status: "SOLVED", solvedAt: now } });
}

/** Tickets whose latest agent reply the customer hasn't opened yet. */
export async function unreadCount(userId: string): Promise<number> {
  return (await listMyTickets(userId)).filter((t) => t.unread).length;
}

// ───────────────────────── Agents ─────────────────────────

export interface Agent {
  id: string;
  name: string;
}

export type InboxFilter = "open" | "mine" | "unassigned" | "pending" | "solved";

export async function agentInbox(agent: Agent, filter: InboxFilter, search = ""): Promise<{ tickets: SupportTicketView[]; counts: Record<InboxFilter, number> }> {
  const db = getPrisma();
  const q = cleanText(search, 80);
  const where: Prisma.SupportTicketWhereInput = {
    ...(filter === "open" ? { status: "OPEN" } : filter === "pending" ? { status: "PENDING" } : filter === "solved" ? { status: "SOLVED" } : filter === "mine" ? { assigneeId: agent.id, status: { not: "SOLVED" } } : { assigneeId: null, status: { not: "SOLVED" } }),
    ...(q ? { OR: [{ subject: { contains: q, mode: "insensitive" } }, { requesterName: { contains: q, mode: "insensitive" } }, { requesterEmail: { contains: q, mode: "insensitive" } }, ...(/^(sup-)?\d+$/i.test(q) ? [{ number: Number(q.replace(/\D/g, "")) }] : [])] } : {}),
  };
  const [rows, open, mine, unassigned, pending, solved] = await Promise.all([
    db.supportTicket.findMany({ where, include: { ...withAssignee, messages: { orderBy: { seq: "desc" }, take: 1 } }, orderBy: { lastMessageAt: "desc" }, take: 100 }),
    db.supportTicket.count({ where: { status: "OPEN" } }),
    db.supportTicket.count({ where: { assigneeId: agent.id, status: { not: "SOLVED" } } }),
    db.supportTicket.count({ where: { assigneeId: null, status: { not: "SOLVED" } } }),
    db.supportTicket.count({ where: { status: "PENDING" } }),
    db.supportTicket.count({ where: { status: "SOLVED" } }),
  ]);
  return {
    tickets: rows.map((t) => view(t, { unread: t.status === "OPEN", preview: t.messages[0]?.body.slice(0, 120) ?? "" })),
    counts: { open, mine, unassigned, pending, solved },
  };
}

export async function agentThread(id: string, after = 0, now = new Date()): Promise<SupportThreadResponse> {
  const db = getPrisma();
  const ticket = await db.supportTicket.findUnique({ where: { id }, include: withAssignee });
  if (!ticket) throw new SupportError("Conversation not found.", 404);
  const messages = await db.supportMessage.findMany({ where: { ticketId: id, seq: { gt: after } }, orderBy: { seq: "asc" }, take: 300 });
  return { ticket: view(ticket), messages: messages.map(messageView), agentOnline: (await onlineAgentCount(now)) > 0 };
}

export async function agentReply(agent: Agent, id: string, body: string, opts: { internal?: boolean } = {}, now = new Date()): Promise<SupportMessageView> {
  const db = getPrisma();
  const ticket = await db.supportTicket.findUnique({ where: { id } });
  if (!ticket) throw new SupportError("Conversation not found.", 404);
  const text = cleanMessage(body, SUPPORT_LIMITS.message);
  if (!text) throw new SupportError("Write a message first.");
  const internal = Boolean(opts.internal);
  const message = await db.supportMessage.create({ data: { ticketId: id, authorType: "AGENT", authorUserId: agent.id, authorName: cleanText(agent.name, SUPPORT_LIMITS.name) || "Support", body: text, internal, createdAt: now } });
  if (internal) return messageView(message);

  await db.supportTicket.update({
    where: { id },
    data: { status: "PENDING", solvedAt: null, lastMessageAt: now, assigneeId: ticket.assigneeId ?? agent.id },
  });
  const watching = ticket.customerSeenAt && now.getTime() - ticket.customerSeenAt.getTime() < WATCHING_MS && ticket.channel === "CHAT";
  if (!watching) {
    try {
      await sendAgentReply({ id, number: ticket.number, subject: ticket.subject, requesterName: ticket.requesterName, requesterEmail: ticket.requesterEmail, hasAccount: Boolean(ticket.requesterId) }, agent.name.split(" ")[0] || "Support", { id: message.id, body: text });
    } catch (error) {
      console.error("[support] reply email failed", error instanceof Error ? error.message : error);
    }
  }
  return messageView(message);
}

export async function agentSetStatus(agent: Agent, id: string, status: SupportStatusId, now = new Date()) {
  if (!["OPEN", "PENDING", "SOLVED"].includes(status)) throw new SupportError("Unknown status.");
  const db = getPrisma();
  const ticket = await db.supportTicket.findUnique({ where: { id }, select: { id: true } });
  if (!ticket) throw new SupportError("Conversation not found.", 404);
  await db.$transaction([
    db.supportTicket.update({ where: { id }, data: { status, solvedAt: status === "SOLVED" ? now : null } }),
    db.supportMessage.create({ data: { ticketId: id, authorType: "SYSTEM", authorName: "System", internal: true, body: `${agent.name} marked this ${status.toLowerCase()}.`, createdAt: now } }),
  ]);
}

export async function agentAssign(agent: Agent, id: string, assigneeId: string | null, now = new Date()) {
  const db = getPrisma();
  const ticket = await db.supportTicket.findUnique({ where: { id }, select: { id: true } });
  if (!ticket) throw new SupportError("Conversation not found.", 404);
  let who = "nobody";
  if (assigneeId) {
    const target = await db.supportAgent.findUnique({ where: { userId: assigneeId }, include: { user: { select: { name: true } } } });
    const self = assigneeId === agent.id;
    if (!target && !self) throw new SupportError("That person isn't a support agent.");
    who = self ? "themselves" : (target?.user.name ?? "an agent");
  }
  await db.$transaction([
    db.supportTicket.update({ where: { id }, data: { assigneeId } }),
    db.supportMessage.create({ data: { ticketId: id, authorType: "SYSTEM", authorName: "System", internal: true, body: assigneeId ? `${agent.name} assigned this to ${who}.` : `${agent.name} unassigned this.`, createdAt: now } }),
  ]);
}

/** Heartbeat from the agent inbox. Passing `available` also flips the availability switch. */
export async function agentPresence(agent: Agent, available: boolean | undefined, now = new Date()): Promise<{ available: boolean; agentsOnline: number }> {
  const db = getPrisma();
  const row = await db.supportAgent.upsert({
    where: { userId: agent.id },
    create: { userId: agent.id, displayName: agent.name, available: available ?? false, lastSeenAt: now },
    update: { lastSeenAt: now, displayName: agent.name, ...(available === undefined ? {} : { available }) },
  });
  return { available: row.available, agentsOnline: await onlineAgentCount(now) };
}

export async function listAgents(): Promise<{ id: string; name: string }[]> {
  const rows = await getPrisma().supportAgent.findMany({ include: { user: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 50 });
  return rows.map((r) => ({ id: r.userId, name: r.user.name || r.displayName || "Agent" }));
}
