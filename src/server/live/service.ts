import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { REACTION_EMOJI, LIMITS, SLOW_MODE_CHOICES, type LiveChatMessage, type LivePollView, type LiveQuestion, type LiveSyncResponse } from "@/lib/live/types";
import { cleanText } from "@/lib/live/text";
import { getPrisma } from "@/server/db/prisma";
import type { RoomContext } from "./context";

export class LiveError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

const PRESENCE_WINDOW_MS = 30_000;
const CHAT_BACKLOG = 60;
const CHAT_PAGE = 100;
const QUESTION_CAP = 100;
const REACTION_PAGE = 40;
const REMOVED_WINDOW_MS = 5 * 60_000;

type MessageRow = Awaited<ReturnType<typeof loadMessages>>[number];

function chatView(row: MessageRow, viewerKey: string): LiveChatMessage {
  return { id: row.id, seq: row.seq, name: row.authorName, isHost: row.isHost, body: row.body, at: row.createdAt.toISOString(), pinned: row.pinned, mine: row.viewerKey === viewerKey };
}

function loadMessages(webinarId: string, after: number, take: number, backlog: boolean) {
  const db = getPrisma();
  if (backlog) {
    return db.liveMessage.findMany({ where: { webinarId, kind: "CHAT", status: "VISIBLE" }, orderBy: { seq: "desc" }, take }).then((rows) => rows.reverse());
  }
  return db.liveMessage.findMany({ where: { webinarId, kind: "CHAT", status: "VISIBLE", seq: { gt: after } }, orderBy: { seq: "asc" }, take });
}

export function pollOptions(raw: unknown): { id: string; label: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((o) => (o && typeof o === "object" && typeof (o as { id?: unknown }).id === "string" && typeof (o as { label?: unknown }).label === "string" ? [{ id: (o as { id: string }).id, label: (o as { label: string }).label }] : []));
}

async function pollView(webinarId: string, viewerKey: string): Promise<LivePollView | null> {
  const db = getPrisma();
  const poll = await db.livePoll.findFirst({ where: { webinarId }, orderBy: { seq: "desc" } });
  if (!poll) return null;
  const grouped = await db.livePollVote.groupBy({ by: ["optionId"], where: { pollId: poll.id }, _count: { _all: true } });
  const mine = await db.livePollVote.findUnique({ where: { pollId_viewerKey: { pollId: poll.id, viewerKey } }, select: { optionId: true } });
  const counts = new Map(grouped.map((g) => [g.optionId, g._count._all]));
  const options = pollOptions(poll.options).map((o) => ({ ...o, votes: counts.get(o.id) ?? 0 }));
  return { id: poll.id, question: poll.question, status: poll.status, options, total: options.reduce((n, o) => n + o.votes, 0), myVote: mine?.optionId ?? null };
}

/**
 * One round trip per poll: records presence and returns everything new since the client's cursors.
 * Hosts additionally see hidden messages' state so they can moderate.
 */
export async function syncRoom(ctx: RoomContext, cursor: { messages: number; reactions: number }, now = new Date()): Promise<LiveSyncResponse> {
  const db = getPrisma();
  const { webinar, organizationId, actor, features } = ctx;
  const webinarId = webinar.id;

  await db.livePresence.upsert({
    where: { webinarId_viewerKey: { webinarId, viewerKey: actor.viewerKey } },
    create: { organizationId, webinarId, viewerKey: actor.viewerKey, lastSeenAt: now },
    update: { lastSeenAt: now },
  });

  const firstLoad = cursor.messages <= 0;
  const [state, rows, pinnedRow, removed, qrows, poll, reactionRows, viewers, lastReaction] = await Promise.all([
    db.liveRoomState.findUnique({ where: { webinarId } }),
    features.chat ? loadMessages(webinarId, cursor.messages, firstLoad ? CHAT_BACKLOG : CHAT_PAGE, firstLoad) : Promise.resolve([]),
    features.chat ? db.liveMessage.findFirst({ where: { webinarId, kind: "CHAT", pinned: true, status: "VISIBLE" }, orderBy: { seq: "desc" } }) : Promise.resolve(null),
    features.chat && !firstLoad ? db.liveMessage.findMany({ where: { webinarId, status: "HIDDEN", updatedAt: { gt: new Date(now.getTime() - REMOVED_WINDOW_MS) } }, select: { id: true }, take: 100 }) : Promise.resolve([]),
    features.qa ? db.liveMessage.findMany({ where: { webinarId, kind: "QUESTION", status: { in: ["VISIBLE", "ANSWERED"] } }, orderBy: { seq: "asc" }, take: QUESTION_CAP }) : Promise.resolve([]),
    features.polls ? pollView(webinarId, actor.viewerKey) : Promise.resolve(null),
    features.reactions && cursor.reactions >= 0 ? db.liveReaction.findMany({ where: { webinarId, seq: { gt: cursor.reactions } }, orderBy: { seq: "asc" }, take: REACTION_PAGE }) : Promise.resolve([]),
    features.viewerCount || actor.isHost ? db.livePresence.count({ where: { webinarId, lastSeenAt: { gt: new Date(now.getTime() - PRESENCE_WINDOW_MS) } } }) : Promise.resolve(null),
    features.reactions && cursor.reactions < 0 ? db.liveReaction.findFirst({ where: { webinarId }, orderBy: { seq: "desc" }, select: { seq: true } }) : Promise.resolve(null),
  ]);

  const messages = rows.map((r) => chatView(r, actor.viewerKey));
  const questions: LiveQuestion[] = qrows.map((q) => ({ id: q.id, seq: q.seq, name: q.authorName, body: q.body, at: q.createdAt.toISOString(), status: q.status, answer: q.answer, mine: q.viewerKey === actor.viewerKey }));
  // A cursor below zero means "just joined": start from now so old reactions aren't replayed.
  const reactionCursor = cursor.reactions >= 0 ? (reactionRows.at(-1)?.seq ?? cursor.reactions) : (lastReaction?.seq ?? 0);
  const busy = (viewers ?? 0) > 200;

  return {
    now: now.toISOString(),
    features: { chat: features.chat, viewerCount: features.viewerCount, reactions: features.reactions, qa: features.qa, polls: features.polls, announcements: features.announcements, moderationTools: features.moderationTools, transcriptExport: features.transcriptExport },
    lockedByPlan: actor.isHost ? features.lockedByPlan : [],
    role: actor.isHost ? "host" : "attendee",
    viewers,
    room: {
      chatLocked: state?.chatLocked ?? false,
      slowModeSeconds: state?.slowModeSeconds ?? 0,
      announcement: features.announcements ? (state?.announcement ?? null) : null,
      announcementAt: features.announcements ? (state?.announcementAt?.toISOString() ?? null) : null,
    },
    messages,
    removedIds: removed.map((r) => r.id),
    pinned: pinnedRow && features.announcements ? chatView(pinnedRow, actor.viewerKey) : null,
    questions,
    poll,
    reactions: reactionRows.map((r) => ({ seq: r.seq, emoji: r.emoji })),
    cursor: { messages: messages.length ? messages[messages.length - 1].seq : cursor.messages, reactions: reactionCursor },
    pollEveryMs: busy ? 5000 : 3000,
  };
}

function requireFeature(ok: boolean, label: string) {
  if (!ok) throw new LiveError(`${label} isn't available in this room.`, 403);
}

/** Attendee and host chat, questions, reactions and votes. */
export async function performAction(ctx: RoomContext, action: { type: string; [key: string]: unknown }, now = new Date()): Promise<{ ok: true; message?: LiveChatMessage }> {
  const db = getPrisma();
  const { webinar, organizationId, actor, features } = ctx;
  const webinarId = webinar.id;

  if (action.type === "chat" || action.type === "question") {
    const isChat = action.type === "chat";
    requireFeature(isChat ? features.chat : features.qa, isChat ? "Chat" : "Q&A");
    const body = cleanText(action.text, isChat ? LIMITS.chat : LIMITS.question);
    if (!body) throw new LiveError("Write something first.");
    const state = await db.liveRoomState.findUnique({ where: { webinarId } });
    if (!actor.isHost) {
      if (state?.mutedKeys.includes(actor.viewerKey)) throw new LiveError("The host has muted you in this room.", 403);
      if (isChat && state?.chatLocked) throw new LiveError("The host has paused chat for now.", 403);
      const gap = isChat ? Math.max(1, state?.slowModeSeconds ?? 0) : 10;
      const recent = await db.liveMessage.findFirst({ where: { webinarId, viewerKey: actor.viewerKey, kind: isChat ? "CHAT" : "QUESTION", createdAt: { gt: new Date(now.getTime() - gap * 1000) } }, select: { createdAt: true } });
      if (recent) {
        const wait = Math.max(1, Math.ceil((recent.createdAt.getTime() + gap * 1000 - now.getTime()) / 1000));
        throw new LiveError(isChat ? `Slow mode is on. You can send again in ${wait}s.` : `Please wait ${wait}s before asking another question.`, 429);
      }
    }
    const row = await db.liveMessage.create({
      data: { organizationId, webinarId, viewerKey: actor.viewerKey, authorName: actor.name, isHost: actor.isHost, kind: isChat ? "CHAT" : "QUESTION", body, createdAt: now },
    });
    return { ok: true, message: chatView(row, actor.viewerKey) };
  }

  if (action.type === "reaction") {
    requireFeature(features.reactions, "Reactions");
    const emoji = String(action.emoji);
    if (!(REACTION_EMOJI as readonly string[]).includes(emoji)) throw new LiveError("Unknown reaction.");
    await db.liveReaction.create({ data: { organizationId, webinarId, emoji } });
    return { ok: true };
  }

  if (action.type === "vote") {
    requireFeature(features.polls, "Polls");
    const poll = await db.livePoll.findFirst({ where: { id: String(action.pollId), webinarId } });
    if (!poll || poll.status !== "OPEN") throw new LiveError("This poll is closed.", 409);
    if (!pollOptions(poll.options).some((o) => o.id === action.optionId)) throw new LiveError("Unknown option.");
    try {
      await db.livePollVote.create({ data: { pollId: poll.id, viewerKey: actor.viewerKey, optionId: String(action.optionId) } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new LiveError("You've already voted in this poll.", 409);
      throw error;
    }
    return { ok: true };
  }

  throw new LiveError("Unknown action.");
}

async function ownMessage(webinarId: string, id: string) {
  const row = await getPrisma().liveMessage.findFirst({ where: { id, webinarId } });
  if (!row) throw new LiveError("Message not found.", 404);
  return row;
}

/** Host-only controls. Plan-gated ones are checked here, not just in the UI. */
export async function performHostAction(ctx: RoomContext, action: { type: string; [key: string]: unknown }, now = new Date()): Promise<{ ok: true; pollId?: string }> {
  if (!ctx.actor.isHost) throw new LiveError("Only the host can do this.", 403);
  const db = getPrisma();
  const { webinar, organizationId, features } = ctx;
  const webinarId = webinar.id;
  const upsertState = (data: Omit<Prisma.LiveRoomStateUncheckedUpdateInput, "webinarId" | "organizationId">) =>
    db.liveRoomState.upsert({ where: { webinarId }, create: { ...(data as Omit<Prisma.LiveRoomStateUncheckedCreateInput, "webinarId" | "organizationId">), webinarId, organizationId }, update: data });

  switch (action.type) {
    case "hide": {
      const row = await ownMessage(webinarId, String(action.messageId));
      await db.liveMessage.update({ where: { id: row.id }, data: { status: "HIDDEN", pinned: false } });
      return { ok: true };
    }
    case "answer": {
      requireFeature(features.qa, "Q&A");
      const row = await ownMessage(webinarId, String(action.messageId));
      if (row.kind !== "QUESTION") throw new LiveError("Only questions can be answered.");
      const answer = cleanText(action.answer ?? "", LIMITS.answer);
      await db.liveMessage.update({ where: { id: row.id }, data: { status: "ANSWERED", answer: answer || null } });
      return { ok: true };
    }
    case "pin": {
      requireFeature(features.announcements, "Pinned messages");
      const row = await ownMessage(webinarId, String(action.messageId));
      if (row.kind !== "CHAT" || row.status !== "VISIBLE") throw new LiveError("Only visible chat messages can be pinned.");
      await db.$transaction([
        db.liveMessage.updateMany({ where: { webinarId, pinned: true }, data: { pinned: false } }),
        ...(action.pinned ? [db.liveMessage.update({ where: { id: row.id }, data: { pinned: true } })] : []),
      ]);
      return { ok: true };
    }
    case "announce": {
      requireFeature(features.announcements, "Announcements");
      const text = action.text === null ? "" : cleanText(action.text, LIMITS.announcement);
      await upsertState({ announcement: text || null, announcementAt: text ? now : null });
      return { ok: true };
    }
    case "lock": {
      requireFeature(features.moderationTools, "Chat lock");
      await upsertState({ chatLocked: Boolean(action.locked) });
      return { ok: true };
    }
    case "slow": {
      requireFeature(features.moderationTools, "Slow mode");
      const seconds = Number(action.seconds);
      if (!(SLOW_MODE_CHOICES as readonly number[]).includes(seconds)) throw new LiveError("Choose one of the slow mode options.");
      await upsertState({ slowModeSeconds: seconds });
      return { ok: true };
    }
    case "mute": {
      requireFeature(features.moderationTools, "Muting");
      const row = await ownMessage(webinarId, String(action.messageId));
      if (row.isHost) throw new LiveError("You can't mute a host.");
      const state = await db.liveRoomState.findUnique({ where: { webinarId } });
      const muted = Array.from(new Set([...(state?.mutedKeys ?? []), row.viewerKey])).slice(-500);
      await upsertState({ mutedKeys: muted });
      await db.liveMessage.updateMany({ where: { webinarId, viewerKey: row.viewerKey, status: "VISIBLE" }, data: { status: "HIDDEN", pinned: false } });
      return { ok: true };
    }
    case "poll_create": {
      requireFeature(features.polls, "Polls");
      const question = cleanText(action.question, LIMITS.pollQuestion);
      const labels = (Array.isArray(action.options) ? action.options : []).map((o) => cleanText(o, LIMITS.pollOption)).filter(Boolean);
      if (!question) throw new LiveError("Add a question for the poll.");
      if (labels.length < LIMITS.pollOptionsMin || labels.length > LIMITS.pollOptionsMax) throw new LiveError(`Give the poll ${LIMITS.pollOptionsMin} to ${LIMITS.pollOptionsMax} options.`);
      if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) throw new LiveError("Poll options must be different from each other.");
      const options = labels.map((label) => ({ id: randomUUID().slice(0, 8), label }));
      const [, created] = await db.$transaction([
        db.livePoll.updateMany({ where: { webinarId, status: "OPEN" }, data: { status: "CLOSED", closedAt: now } }),
        db.livePoll.create({ data: { organizationId, webinarId, question, options } }),
      ]);
      return { ok: true, pollId: created.id };
    }
    case "poll_close": {
      requireFeature(features.polls, "Polls");
      const result = await db.livePoll.updateMany({ where: { id: String(action.pollId), webinarId, status: "OPEN" }, data: { status: "CLOSED", closedAt: now } });
      if (!result.count) throw new LiveError("That poll is already closed.", 409);
      return { ok: true };
    }
    default:
      throw new LiveError("Unknown action.");
  }
}

/** Chat and Q&A as CSV (business plan). */
export async function exportTranscript(ctx: RoomContext): Promise<string> {
  if (!ctx.actor.isHost) throw new LiveError("Only the host can export.", 403);
  requireFeature(ctx.features.transcriptExport, "Export");
  const rows = await getPrisma().liveMessage.findMany({ where: { webinarId: ctx.webinar.id }, orderBy: { seq: "asc" }, take: 20_000 });
  const esc = (v: string) => {
    // Guard against spreadsheet formula injection from attendee-supplied text.
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const lines = [["time", "type", "from", "status", "message", "answer"].join(",")];
  for (const r of rows) lines.push([r.createdAt.toISOString(), r.kind.toLowerCase(), esc(r.authorName), r.status.toLowerCase(), esc(r.body), esc(r.answer ?? "")].join(","));
  return lines.join("\n");
}

/** Housekeeping for the cron tick: old reactions and presence rows have no value after a day. */
export async function pruneLiveData(now = new Date()) {
  const db = getPrisma();
  const cutoff = new Date(now.getTime() - 24 * 3_600_000);
  const [reactions, presence] = await Promise.all([db.liveReaction.deleteMany({ where: { createdAt: { lt: cutoff } } }), db.livePresence.deleteMany({ where: { lastSeenAt: { lt: cutoff } } })]);
  return { reactions: reactions.count, presence: presence.count };
}
