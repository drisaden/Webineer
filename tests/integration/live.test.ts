import { after, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createUser, createWebinar, db, resetDatabase } from "./helpers";
import { createOrganizationWithOwner } from "../../src/server/db/organizations";
import { resolveLiveFeatures, type PlanKeyLike } from "../../src/lib/live/features";
import { exportTranscript, LiveError, performAction, performHostAction, pruneLiveData, syncRoom } from "../../src/server/live/service";
import type { RoomActor, RoomContext } from "../../src/server/live/context";
import type { Webinar } from "../../src/types";

beforeEach(resetDatabase);
after(() => db.$disconnect());

const ON = { chatEnabled: true, qaEnabled: true, pollsEnabled: true, reactionsEnabled: true, viewerCountEnabled: true } as never;

async function room(plan: PlanKeyLike = "business", live: object = ON) {
  const owner = await createUser();
  const org = await createOrganizationWithOwner(db, owner, { name: "Org" });
  const webinar = await createWebinar(org.id);
  const make = (actor: RoomActor): RoomContext => ({ webinar: { id: webinar.id } as Webinar, organizationId: org.id, plan: plan as never, features: resolveLiveFeatures(plan, live as never), actor });
  return {
    webinar,
    host: make({ viewerKey: "host:1", name: "Host", isHost: true }),
    ada: make({ viewerKey: "reg:ada", name: "Ada L.", isHost: false }),
    bo: make({ viewerKey: "reg:bo", name: "Bo K.", isHost: false }),
  };
}
const cursor0 = { messages: 0, reactions: -1 };
const fails = async (p: Promise<unknown>, status: number, match?: RegExp) => {
  await assert.rejects(p, (e: unknown) => e instanceof LiveError && e.status === status && (!match || match.test(e.message)));
};

describe("live chat", () => {
  test("messages reach everyone and are delivered once per cursor", async () => {
    const r = await room();
    await performAction(r.ada, { type: "chat", text: "  Hello   everyone " });
    await performAction(r.host, { type: "chat", text: "Welcome!" });
    const first = await syncRoom(r.bo, cursor0);
    assert.deepEqual(first.messages.map((m) => [m.name, m.body, m.isHost, m.mine]), [["Ada L.", "Hello everyone", false, false], ["Host", "Welcome!", true, false]]);
    const again = await syncRoom(r.bo, first.cursor);
    assert.equal(again.messages.length, 0);
    await performAction(r.bo, { type: "chat", text: "me too" });
    const next = await syncRoom(r.ada, first.cursor);
    assert.deepEqual(next.messages.map((m) => m.body), ["me too"]);
  });

  test("viewer keys and emails never leave the server", async () => {
    const r = await room();
    await performAction(r.ada, { type: "chat", text: "hi" });
    const json = JSON.stringify(await syncRoom(r.bo, cursor0));
    assert.ok(!json.includes("reg:ada") && !json.includes("viewerKey"));
  });

  test("empty and oversized text is handled", async () => {
    const r = await room();
    await fails(performAction(r.ada, { type: "chat", text: "   " }), 400);
    await performAction(r.ada, { type: "chat", text: "x".repeat(900) });
    const [m] = (await syncRoom(r.bo, cursor0)).messages;
    assert.equal(m.body.length, 300);
  });

  test("slow mode limits attendees but not the host", async () => {
    const r = await room();
    await performHostAction(r.host, { type: "slow", seconds: 30 });
    await performAction(r.ada, { type: "chat", text: "one" });
    await fails(performAction(r.ada, { type: "chat", text: "two" }), 429, /Slow mode/);
    await performAction(r.bo, { type: "chat", text: "someone else is fine" });
    await performAction(r.host, { type: "chat", text: "a" });
    await performAction(r.host, { type: "chat", text: "b" });
  });

  test("locking chat stops attendees only", async () => {
    const r = await room();
    await performHostAction(r.host, { type: "lock", locked: true });
    await fails(performAction(r.ada, { type: "chat", text: "hi" }), 403, /paused/);
    await performAction(r.host, { type: "chat", text: "host can still talk" });
    assert.equal((await syncRoom(r.ada, cursor0)).room.chatLocked, true);
    await performHostAction(r.host, { type: "lock", locked: false });
    await performAction(r.ada, { type: "chat", text: "back" });
  });

  test("muting hides the sender's messages and blocks new ones", async () => {
    const r = await room();
    await performAction(r.ada, { type: "chat", text: "spam" });
    const seen = await syncRoom(r.bo, cursor0);
    await performHostAction(r.host, { type: "mute", messageId: seen.messages[0].id });
    await fails(performAction(r.ada, { type: "chat", text: "more" }), 403, /muted/);
    const after = await syncRoom(r.bo, seen.cursor);
    assert.deepEqual(after.removedIds, [seen.messages[0].id]);
    assert.equal((await syncRoom(r.bo, cursor0)).messages.length, 0);
  });

  test("removed messages are reported to clients that already have them", async () => {
    const r = await room("free");
    await performAction(r.ada, { type: "chat", text: "oops" });
    const seen = await syncRoom(r.bo, cursor0);
    await performHostAction(r.host, { type: "hide", messageId: seen.messages[0].id });
    assert.deepEqual((await syncRoom(r.bo, seen.cursor)).removedIds, [seen.messages[0].id]);
  });

  test("a different webinar's messages are not touchable", async () => {
    const a = await room();
    const b = await room();
    await performAction(a.ada, { type: "chat", text: "mine" });
    const id = (await syncRoom(a.bo, cursor0)).messages[0].id;
    await fails(performHostAction(b.host, { type: "hide", messageId: id }), 404);
  });
});

describe("plan gating on the server", () => {
  test("free: no reactions, Q&A, polls, pins, announcements, moderation or export", async () => {
    const r = await room("free");
    await performAction(r.ada, { type: "chat", text: "chat works" });
    await fails(performAction(r.ada, { type: "reaction", emoji: "🔥" }), 403);
    await fails(performAction(r.ada, { type: "question", text: "why?" }), 403);
    const id = (await syncRoom(r.bo, cursor0)).messages[0].id;
    for (const action of [{ type: "pin", messageId: id, pinned: true }, { type: "announce", text: "hi" }, { type: "lock", locked: true }, { type: "slow", seconds: 10 }, { type: "mute", messageId: id }, { type: "poll_create", question: "q?", options: ["a", "b"] }]) {
      await fails(performHostAction(r.host, action), 403);
    }
    await fails(exportTranscript(r.host), 403);
    const sync = await syncRoom(r.bo, cursor0);
    assert.deepEqual([sync.features.reactions, sync.features.qa, sync.features.polls], [false, false, false]);
    assert.deepEqual(sync.questions, []);
    assert.equal(sync.poll, null);
  });

  test("starter: reactions and Q&A work, polls do not", async () => {
    const r = await room("starter");
    await performAction(r.ada, { type: "reaction", emoji: "🔥" });
    await performAction(r.ada, { type: "question", text: "How long is the replay?" });
    await fails(performHostAction(r.host, { type: "poll_create", question: "q?", options: ["a", "b"] }), 403);
  });

  test("the host switching a feature off also disables it on the server", async () => {
    const r = await room("business", { ...(ON as object), chatEnabled: false });
    await fails(performAction(r.ada, { type: "chat", text: "hi" }), 403);
  });

  test("only hosts can use host actions", async () => {
    const r = await room();
    await fails(performHostAction(r.ada, { type: "announce", text: "pwned" }), 403);
  });

  test("export is business only and neutralises spreadsheet formulas", async () => {
    const pro = await room("professional");
    await fails(exportTranscript(pro.host), 403);
    const r = await room("business");
    await performAction(r.ada, { type: "chat", text: "=HYPERLINK(\"http://evil\")" });
    await performAction(r.ada, { type: "question", text: "Normal, with comma" });
    const csv = await exportTranscript(r.host);
    assert.match(csv, /"'=HYPERLINK/);
    assert.match(csv, /"Normal, with comma"/);
    await fails(exportTranscript(r.ada), 403);
  });
});

describe("questions, announcements and pins", () => {
  test("a question is visible, can be answered, and answers show to everyone", async () => {
    const r = await room();
    await performAction(r.ada, { type: "question", text: "Will there be a replay?" });
    await fails(performAction(r.ada, { type: "question", text: "again" }), 429);
    const [q] = (await syncRoom(r.bo, cursor0)).questions;
    assert.equal(q.status, "VISIBLE");
    await performHostAction(r.host, { type: "answer", messageId: q.id, answer: "Yes, within 24 hours." });
    const [done] = (await syncRoom(r.bo, cursor0)).questions;
    assert.deepEqual([done.status, done.answer, done.mine], ["ANSWERED", "Yes, within 24 hours.", false]);
    assert.equal((await syncRoom(r.ada, cursor0)).questions[0].mine, true);
  });

  test("announcement can be posted and cleared, one message is pinned at a time", async () => {
    const r = await room();
    await performHostAction(r.host, { type: "announce", text: "  Offer ends at 6pm  " });
    assert.equal((await syncRoom(r.ada, cursor0)).room.announcement, "Offer ends at 6pm");
    await performHostAction(r.host, { type: "announce", text: null });
    assert.equal((await syncRoom(r.ada, cursor0)).room.announcement, null);
    await performAction(r.ada, { type: "chat", text: "first" });
    await performAction(r.bo, { type: "chat", text: "second" });
    const [m1, m2] = (await syncRoom(r.ada, cursor0)).messages;
    await performHostAction(r.host, { type: "pin", messageId: m1.id, pinned: true });
    await performHostAction(r.host, { type: "pin", messageId: m2.id, pinned: true });
    assert.equal((await syncRoom(r.ada, cursor0)).pinned?.body, "second");
    await performHostAction(r.host, { type: "pin", messageId: m2.id, pinned: false });
    assert.equal((await syncRoom(r.ada, cursor0)).pinned, null);
  });
});

describe("polls", () => {
  test("create, vote once, results, close, and a new poll closes the previous one", async () => {
    const r = await room();
    const { pollId } = await performHostAction(r.host, { type: "poll_create", question: "Next topic?", options: ["Ads", "SEO", "Email"] });
    const open = (await syncRoom(r.ada, cursor0)).poll!;
    assert.deepEqual([open.status, open.total, open.myVote], ["OPEN", 0, null]);
    await performAction(r.ada, { type: "vote", pollId: pollId!, optionId: open.options[1].id });
    await performAction(r.bo, { type: "vote", pollId: pollId!, optionId: open.options[1].id });
    await fails(performAction(r.ada, { type: "vote", pollId: pollId!, optionId: open.options[0].id }), 409, /already voted/);
    await fails(performAction(r.bo, { type: "vote", pollId: pollId!, optionId: "nope" }), 400);
    const mid = (await syncRoom(r.ada, cursor0)).poll!;
    assert.deepEqual([mid.total, mid.myVote, mid.options[1].votes], [2, open.options[1].id, 2]);
    const second = await performHostAction(r.host, { type: "poll_create", question: "Another?", options: ["Yes", "No"] });
    await fails(performAction(r.ada, { type: "vote", pollId: pollId!, optionId: open.options[0].id }), 409, /closed/);
    assert.equal((await syncRoom(r.ada, cursor0)).poll?.question, "Another?");
    await performHostAction(r.host, { type: "poll_close", pollId: second.pollId! });
    assert.equal((await syncRoom(r.ada, cursor0)).poll?.status, "CLOSED");
    await fails(performHostAction(r.host, { type: "poll_close", pollId: second.pollId! }), 409);
  });

  test("poll input is validated", async () => {
    const r = await room();
    await fails(performHostAction(r.host, { type: "poll_create", question: "", options: ["a", "b"] }), 400);
    await fails(performHostAction(r.host, { type: "poll_create", question: "q", options: ["only one"] }), 400);
    await fails(performHostAction(r.host, { type: "poll_create", question: "q", options: ["a", "A"] }), 400, /different/);
    await fails(performHostAction(r.host, { type: "poll_create", question: "q", options: ["1", "2", "3", "4", "5", "6"] }), 400);
  });
});

describe("reactions and presence", () => {
  test("reactions arrive after the viewer's cursor, and unknown emoji are refused", async () => {
    const r = await room();
    const start = await syncRoom(r.bo, cursor0);
    await performAction(r.ada, { type: "reaction", emoji: "👏" });
    await performAction(r.ada, { type: "reaction", emoji: "🎉" });
    await fails(performAction(r.ada, { type: "reaction", emoji: "💣" }), 400);
    assert.equal(start.cursor.reactions, 0, "an empty room starts the cursor at zero, so the very first reaction is not skipped");
    const next = await syncRoom(r.bo, start.cursor);
    assert.deepEqual(next.reactions.map((x) => x.emoji), ["👏", "🎉"]);
    assert.equal((await syncRoom(r.bo, next.cursor)).reactions.length, 0);
    const late = await syncRoom(r.host, cursor0);
    assert.equal(late.reactions.length, 0, "a viewer joining late does not replay old reactions");
  });

  test("viewer count counts people seen in the last 30 seconds", async () => {
    const r = await room();
    const t0 = new Date();
    await syncRoom(r.ada, cursor0, t0);
    await syncRoom(r.bo, cursor0, new Date(t0.getTime() - 120_000));
    const seen = await syncRoom(r.host, cursor0, t0);
    assert.equal(seen.viewers, 2);
    assert.equal((await syncRoom(r.ada, cursor0, new Date(t0.getTime() + 60_000))).viewers, 1);
  });

  test("pruning removes day-old reactions and presence only", async () => {
    const r = await room();
    await performAction(r.ada, { type: "reaction", emoji: "🔥" });
    await syncRoom(r.ada, cursor0);
    const future = new Date(Date.now() + 25 * 3_600_000);
    assert.deepEqual(await pruneLiveData(future), { reactions: 1, presence: 1 });
    await performAction(r.ada, { type: "chat", text: "kept" });
    await pruneLiveData(future);
    assert.equal(await db.liveMessage.count(), 1);
  });
});
