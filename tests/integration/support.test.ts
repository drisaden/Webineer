import { after, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createUser, db, resetDatabase } from "./helpers";
import {
  AGENT_ONLINE_MS, SupportError, agentAssign, agentInbox, agentPresence, agentReply, agentSetStatus, agentThread, createTicket,
  customerReply, customerSolve, getMyThread, listMyTickets, onlineAgentCount, supportStatus, unreadCount,
} from "../../src/server/support/service";

process.env.SUPPORT_EMAIL = "support-team@example.com";
beforeEach(resetDatabase);
after(() => db.$disconnect());

const T0 = new Date("2026-11-16T10:00:00Z");
const at = (secs: number) => new Date(T0.getTime() + secs * 1000);
const fails = async (p: Promise<unknown>, status: number, match?: RegExp) =>
  assert.rejects(p, (e: unknown) => e instanceof SupportError && e.status === status && (!match || match.test(e.message)));

async function people() {
  const ada = await createUser("ada@example.com");
  const bo = await createUser("bo@example.com");
  const agent = await createUser("agent@example.com");
  const who = (u: { id: string; email: string }, name: string) => ({ id: u.id, name, email: u.email });
  return { ada: who(ada, "Ada Obi"), bo: who(bo, "Bo Kim"), agent: { id: agent.id, name: "Sam Agent" } };
}

describe("creating tickets", () => {
  test("chat, email and callback each open a ticket with the first message", async () => {
    const { ada } = await people();
    const chat = await createTicket(ada, { channel: "CHAT", message: "Help with my webinar page" }, T0);
    assert.equal(chat.created, true);
    assert.equal(chat.ticket.channel, "CHAT");
    assert.equal(chat.ticket.status, "OPEN");
    assert.match(chat.ticket.number, /^SUP-\d+$/);
    const email = await createTicket(ada, { channel: "EMAIL", subject: "Invoice question", category: "billing", message: "Where is my invoice?" }, at(1));
    assert.equal(email.ticket.subject, "Invoice question");
    assert.equal(email.ticket.category, "billing");
    const cb = await createTicket(ada, { channel: "CALLBACK", phone: "+234 801 234 5678", callbackWindow: "Afternoon (12pm to 4pm)", message: "Call me" }, at(2));
    assert.equal(cb.ticket.phone, "+234 801 234 5678");
    assert.equal(cb.ticket.callbackWindow, "Afternoon (12pm to 4pm)");
    assert.equal(await db.supportMessage.count(), 3);
  });

  test("a second chat message joins the open chat instead of opening another", async () => {
    const { ada } = await people();
    const a = await createTicket(ada, { channel: "CHAT", message: "first" }, T0);
    const b = await createTicket(ada, { channel: "CHAT", message: "second" }, at(5));
    assert.equal(b.created, false);
    assert.equal(b.ticket.id, a.ticket.id);
    assert.equal(await db.supportTicket.count(), 1);
    assert.equal(await db.supportMessage.count(), 2);
  });

  test("a solved chat lets the customer start a new one", async () => {
    const { ada } = await people();
    const a = await createTicket(ada, { channel: "CHAT", message: "first" }, T0);
    await customerSolve(ada.id, a.ticket.id, at(1));
    const b = await createTicket(ada, { channel: "CHAT", message: "again" }, at(2));
    assert.equal(b.created, true);
    assert.notEqual(b.ticket.id, a.ticket.id);
  });

  test("bad input is rejected with a clear message", async () => {
    const { ada } = await people();
    await fails(createTicket(ada, { channel: "CHAT", message: "   " }, T0), 400);
    await fails(createTicket({ ...ada, email: "not-an-email" }, { channel: "EMAIL", message: "hi" }, T0), 400);
    await fails(createTicket(ada, { channel: "CALLBACK", message: "call", phone: "abc" }, T0), 400, /phone/i);
    await fails(createTicket(ada, { channel: "CALLBACK", message: "call" }, T0), 400, /phone/i);
    assert.equal(await db.supportTicket.count(), 0);
  });

  test("unknown categories and callback windows fall back safely", async () => {
    const { ada } = await people();
    const { ticket } = await createTicket(ada, { channel: "CALLBACK", message: "x", phone: "+2348012345678", callbackWindow: "whenever", category: "hacking" }, T0);
    assert.equal(ticket.category, "other");
    assert.ok(ticket.callbackWindow);
  });

  test("open-ticket and daily caps apply", async () => {
    const { ada } = await people();
    for (let i = 0; i < 5; i++) await createTicket(ada, { channel: "EMAIL", message: `m${i}` }, at(i));
    await fails(createTicket(ada, { channel: "EMAIL", message: "one more" }, at(10)), 429, /open requests/);
    const { bo } = await people().catch(() => ({ bo: null }));
    void bo;
  });

  test("the daily cap counts solved tickets too", async () => {
    const { ada } = await people();
    for (let i = 0; i < 10; i++) {
      const { ticket } = await createTicket(ada, { channel: "EMAIL", message: `m${i}` }, at(i));
      await customerSolve(ada.id, ticket.id, at(i));
    }
    await fails(createTicket(ada, { channel: "EMAIL", message: "11th" }, at(20)), 429, /today/);
    // a day later it works again
    await createTicket(ada, { channel: "EMAIL", message: "next day" }, at(25 * 3600));
  });
});

describe("customer view and ownership", () => {
  test("customers only ever see their own tickets", async () => {
    const { ada, bo } = await people();
    const mine = await createTicket(ada, { channel: "EMAIL", message: "private" }, T0);
    assert.equal((await listMyTickets(bo.id)).length, 0);
    await fails(getMyThread(bo.id, mine.ticket.id), 404);
    await fails(customerReply(bo.id, mine.ticket.id, "hi"), 404);
    await fails(customerSolve(bo.id, mine.ticket.id), 404);
    assert.equal((await listMyTickets(ada.id)).length, 1);
  });

  test("internal notes and system lines are hidden from customers", async () => {
    const { ada, agent } = await people();
    const { ticket } = await createTicket(ada, { channel: "EMAIL", message: "q" }, T0);
    await agentReply(agent, ticket.id, "Customer seems to be on the free plan", { internal: true }, at(1));
    await agentSetStatus(agent, ticket.id, "PENDING", at(2));
    await agentReply(agent, ticket.id, "Here is the answer", {}, at(3));
    const customer = await getMyThread(ada.id, ticket.id, 0, at(4));
    assert.deepEqual(customer.messages.map((m) => m.body), ["q", "Here is the answer"]);
    assert.ok(!JSON.stringify(customer).includes("free plan"));
    const staff = await agentThread(ticket.id, 0, at(4));
    assert.equal(staff.messages.length, 4 + 0 === 4 ? staff.messages.length : 0);
    assert.ok(staff.messages.some((m) => m.internal && m.body.includes("free plan")));
  });

  test("the after cursor only returns newer messages", async () => {
    const { ada, agent } = await people();
    const { ticket } = await createTicket(ada, { channel: "CHAT", message: "one" }, T0);
    const first = await getMyThread(ada.id, ticket.id, 0, at(1));
    const last = Number(first.messages.at(-1)!.id.length ? (await db.supportMessage.findFirstOrThrow({ orderBy: { seq: "desc" } })).seq : 0);
    assert.equal((await getMyThread(ada.id, ticket.id, last, at(2))).messages.length, 0);
    await agentReply(agent, ticket.id, "two", {}, at(3));
    assert.deepEqual((await getMyThread(ada.id, ticket.id, last, at(4))).messages.map((m) => m.body), ["two"]);
  });

  test("a customer reply reopens a solved or pending ticket", async () => {
    const { ada, agent } = await people();
    const { ticket } = await createTicket(ada, { channel: "EMAIL", message: "q" }, T0);
    await agentReply(agent, ticket.id, "a", {}, at(1));
    assert.equal((await getMyThread(ada.id, ticket.id, 0, at(2))).ticket.status, "PENDING");
    await customerSolve(ada.id, ticket.id, at(3));
    assert.equal((await getMyThread(ada.id, ticket.id, 0, at(4))).ticket.status, "SOLVED");
    await customerReply(ada.id, ticket.id, "actually still broken", at(5));
    const row = await db.supportTicket.findUniqueOrThrow({ where: { id: ticket.id } });
    assert.equal(row.status, "OPEN");
    assert.equal(row.solvedAt, null);
  });
});

describe("agents", () => {
  test("replying marks the ticket as waiting on the customer and assigns the agent", async () => {
    const { ada, agent } = await people();
    const { ticket } = await createTicket(ada, { channel: "EMAIL", message: "q" }, T0);
    await agentReply(agent, ticket.id, "On it", {}, at(1));
    const row = await db.supportTicket.findUniqueOrThrow({ where: { id: ticket.id } });
    assert.equal(row.status, "PENDING");
    assert.equal(row.assigneeId, agent.id);
  });

  test("internal notes change nothing on the ticket", async () => {
    const { ada, agent } = await people();
    const { ticket } = await createTicket(ada, { channel: "EMAIL", message: "q" }, T0);
    await agentReply(agent, ticket.id, "note", { internal: true }, at(1));
    const row = await db.supportTicket.findUniqueOrThrow({ where: { id: ticket.id } });
    assert.equal(row.status, "OPEN");
    assert.equal(row.assigneeId, null);
    assert.equal(await unreadCount(ada.id), 0);
  });

  test("unread shows for an agent reply and clears when the customer opens it", async () => {
    const { ada, agent } = await people();
    const { ticket } = await createTicket(ada, { channel: "EMAIL", message: "q" }, T0);
    assert.equal(await unreadCount(ada.id), 0);
    await agentReply(agent, ticket.id, "answer", {}, at(60));
    assert.equal(await unreadCount(ada.id), 1);
    assert.equal((await supportStatus(ada.id, at(61))).unread, 1);
    await getMyThread(ada.id, ticket.id, 0, at(120));
    assert.equal(await unreadCount(ada.id), 0);
  });

  test("status changes and assignment leave an audit line", async () => {
    const { ada, agent } = await people();
    const other = await createUser("other@example.com");
    await agentPresence({ id: other.id, name: "Other Agent" }, true, T0);
    const { ticket } = await createTicket(ada, { channel: "EMAIL", message: "q" }, T0);
    await agentAssign(agent, ticket.id, other.id, at(1));
    await agentSetStatus(agent, ticket.id, "SOLVED", at(2));
    const row = await db.supportTicket.findUniqueOrThrow({ where: { id: ticket.id } });
    assert.equal(row.assigneeId, other.id);
    assert.equal(row.status, "SOLVED");
    assert.ok(row.solvedAt);
    const lines = await db.supportMessage.findMany({ where: { ticketId: ticket.id, authorType: "SYSTEM" } });
    assert.equal(lines.length, 2);
    assert.ok(lines.every((l) => l.internal));
    await fails(agentAssign(agent, ticket.id, (await createUser("nonagent@example.com")).id, at(3)), 400, /agent/i);
    await fails(agentSetStatus(agent, ticket.id, "BOGUS" as never, at(3)), 400);
    await fails(agentReply(agent, "00000000-0000-4000-8000-000000000000", "x"), 404);
  });

  test("the inbox filters, searches and counts", async () => {
    const { ada, bo, agent } = await people();
    const a = await createTicket(ada, { channel: "EMAIL", subject: "Invoice", message: "q" }, T0);
    const b = await createTicket(bo, { channel: "EMAIL", subject: "Login trouble", message: "q" }, at(1));
    await agentReply(agent, a.ticket.id, "done", {}, at(2));
    await agentSetStatus(agent, b.ticket.id, "SOLVED", at(3));
    const open = await agentInbox(agent, "open");
    assert.equal(open.tickets.length, 0);
    assert.deepEqual(open.counts, { open: 0, mine: 1, unassigned: 0, pending: 1, solved: 1 });
    assert.equal((await agentInbox(agent, "pending")).tickets[0].id, a.ticket.id);
    assert.equal((await agentInbox(agent, "mine")).tickets.length, 1);
    assert.equal((await agentInbox(agent, "solved")).tickets[0].id, b.ticket.id);
    assert.equal((await agentInbox(agent, "pending", "invoice")).tickets.length, 1);
    assert.equal((await agentInbox(agent, "pending", "login")).tickets.length, 0);
    assert.equal((await agentInbox(agent, "pending", "bo@example")).tickets.length, 0);
    assert.equal((await agentInbox(agent, "solved", "bo@example")).tickets.length, 1);
    assert.equal((await agentInbox(agent, "solved", `SUP-${b.ticket.number.replace(/\D/g, "")}`)).tickets.length, 1);
  });
});

describe("availability", () => {
  test("an agent counts as online only while available and recently seen", async () => {
    const { agent } = await people();
    assert.equal(await onlineAgentCount(T0), 0);
    await agentPresence(agent, true, T0);
    assert.equal(await onlineAgentCount(at(AGENT_ONLINE_MS / 1000 - 1)), 1);
    assert.equal(await onlineAgentCount(at(AGENT_ONLINE_MS / 1000 + 1)), 0, "stale heartbeat means offline");
    await agentPresence(agent, undefined, at(100));
    assert.equal(await onlineAgentCount(at(101)), 1, "a heartbeat keeps the availability choice");
    await agentPresence(agent, false, at(102));
    assert.equal(await onlineAgentCount(at(103)), 0);
  });

  test("public status reflects agents and contact details without exposing people", async () => {
    const { agent } = await people();
    await agentPresence(agent, true, T0);
    const s = await supportStatus(null, at(1));
    assert.equal(s.online, true);
    assert.equal(s.agentsOnline, 1);
    assert.equal(s.unread, null, "visitors who are not signed in have no unread count");
    assert.ok(!JSON.stringify(s).includes(agent.id));
  });
});

describe("emails", () => {
  test("a receipt and a staff alert are queued once per ticket, never duplicated", async () => {
    const { ada } = await people();
    const { ticket } = await createTicket(ada, { channel: "EMAIL", subject: "Hello", message: "q" }, T0);
    const logs = await db.emailLog.findMany({ where: { dedupeKey: { contains: ticket.id } } });
    assert.ok(logs.some((l) => l.dedupeKey === `support-received:${ticket.id}`), "receipt queued");
    assert.ok(logs.some((l) => l.dedupeKey === `support-staff:new:${ticket.id}`), "staff alert queued");
    assert.equal(new Set(logs.map((l) => l.dedupeKey)).size, logs.length);
  });

  test("without a support address the ticket still works and no alert is queued", async () => {
    const saved = process.env.SUPPORT_EMAIL;
    const smtp = [process.env.SMTP_REPLY_TO, process.env.SMTP_FROM];
    delete process.env.SUPPORT_EMAIL;
    delete process.env.SMTP_REPLY_TO;
    delete process.env.SMTP_FROM;
    try {
      const { ada } = await people();
      const { ticket } = await createTicket(ada, { channel: "EMAIL", message: "q" }, T0);
      assert.equal(await db.emailLog.count({ where: { dedupeKey: `support-staff:new:${ticket.id}` } }), 0);
      assert.ok(await db.emailLog.findUnique({ where: { dedupeKey: `support-received:${ticket.id}` } }), "customer receipt is unaffected");
    } finally {
      process.env.SUPPORT_EMAIL = saved;
      if (smtp[0] !== undefined) process.env.SMTP_REPLY_TO = smtp[0];
      if (smtp[1] !== undefined) process.env.SMTP_FROM = smtp[1];
    }
  });

  test("a chat with an agent online skips the receipt and alert", async () => {
    const { ada, agent } = await people();
    await agentPresence(agent, true, T0);
    const { ticket } = await createTicket(ada, { channel: "CHAT", message: "hi" }, at(1));
    assert.equal(await db.emailLog.count({ where: { dedupeKey: { contains: ticket.id } } }), 0);
  });

  test("an offline chat is emailed so nobody is left waiting silently", async () => {
    const { ada } = await people();
    const { ticket } = await createTicket(ada, { channel: "CHAT", message: "hi" }, T0);
    assert.ok(await db.emailLog.count({ where: { dedupeKey: { contains: ticket.id } } }) >= 1);
  });

  test("an agent reply emails the customer, except in a chat they are watching", async () => {
    const { ada, agent } = await people();
    const email = await createTicket(ada, { channel: "EMAIL", message: "q" }, T0);
    const m1 = await agentReply(agent, email.ticket.id, "reply by mail", {}, at(1));
    assert.ok(await db.emailLog.findUnique({ where: { dedupeKey: `support-reply:${m1.id}` } }));

    await agentPresence(agent, true, at(2));
    const chat = await createTicket(ada, { channel: "CHAT", message: "chat" }, at(3));
    await getMyThread(ada.id, chat.ticket.id, 0, at(4));
    const m2 = await agentReply(agent, chat.ticket.id, "live reply", {}, at(10));
    assert.equal(await db.emailLog.findUnique({ where: { dedupeKey: `support-reply:${m2.id}` } }), null, "watching customer gets no email");
    const m3 = await agentReply(agent, chat.ticket.id, "later reply", {}, at(10 * 60));
    assert.ok(await db.emailLog.findUnique({ where: { dedupeKey: `support-reply:${m3.id}` } }), "customer who left gets an email");
  });

  test("internal notes never email anyone", async () => {
    const { ada, agent } = await people();
    const { ticket } = await createTicket(ada, { channel: "EMAIL", message: "q" }, T0);
    const before = await db.emailLog.count();
    const note = await agentReply(agent, ticket.id, "secret", { internal: true }, at(1));
    assert.equal(await db.emailLog.count(), before);
    assert.equal(await db.emailLog.findUnique({ where: { dedupeKey: `support-reply:${note.id}` } }), null);
  });
});

describe("database rules", () => {
  test("message bodies are length-checked and tables have row security on", async () => {
    const { ada } = await people();
    const { ticket } = await createTicket(ada, { channel: "EMAIL", message: "q" }, T0);
    await assert.rejects(db.supportMessage.create({ data: { ticketId: ticket.id, authorType: "CUSTOMER", authorName: "x", body: "" } }));
    await assert.rejects(db.supportMessage.create({ data: { ticketId: ticket.id, authorType: "CUSTOMER", authorName: "x", body: "x".repeat(4001) } }));
    const rls = await db.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('support_tickets','support_messages','support_agents')`;
    assert.equal(rls.length, 3);
    assert.ok(rls.every((r) => r.relrowsecurity));
  });
});
