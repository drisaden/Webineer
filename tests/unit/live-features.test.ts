import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { hostLiveChoices, planThatUnlocks, resolveLiveFeatures } from "../../src/lib/live/features";
import { cleanText, initialsOf, publicName } from "../../src/lib/live/text";
import { createDefaultWorkflowConfig } from "../../src/lib/webinar-workflow/defaults";
import { sectionSchemas } from "../../src/lib/webinar-workflow/schemas";

const allOn = { chatEnabled: true, qaEnabled: true, pollsEnabled: true, reactionsEnabled: true, viewerCountEnabled: true } as never;

describe("live room features by plan", () => {
  test("free has chat and the viewer count only", () => {
    const f = resolveLiveFeatures("free", allOn);
    assert.deepEqual([f.chat, f.viewerCount, f.reactions, f.qa, f.polls, f.announcements, f.moderationTools, f.transcriptExport], [true, true, false, false, false, false, false, false]);
    assert.deepEqual([...f.lockedByPlan].sort(), ["polls", "qa", "reactions"]);
  });

  test("starter adds reactions and Q&A, professional adds polls and host tools, business adds export", () => {
    const s = resolveLiveFeatures("starter", allOn);
    assert.deepEqual([s.reactions, s.qa, s.polls, s.moderationTools], [true, true, false, false]);
    const p = resolveLiveFeatures("professional", allOn);
    assert.deepEqual([p.polls, p.announcements, p.moderationTools, p.transcriptExport], [true, true, true, false]);
    const b = resolveLiveFeatures("business", allOn);
    assert.equal(b.transcriptExport, true);
    assert.deepEqual(b.lockedByPlan, []);
  });

  test("a feature the host switched off stays off even when the plan includes it", () => {
    const f = resolveLiveFeatures("business", { ...(allOn as object), chatEnabled: false, pollsEnabled: false } as never);
    assert.equal(f.chat, false);
    assert.equal(f.polls, false);
    assert.equal(f.qa, true);
  });

  test("older webinars: chat and Q&A are opt-in, the other features default on", () => {
    assert.deepEqual(hostLiveChoices({ chatEnabled: false, qaEnabled: false } as never), { chat: false, qa: false, polls: true, reactions: true, viewerCount: true });
  });

  test("each feature points at the cheapest plan that has it", () => {
    assert.equal(planThatUnlocks("chat"), "free");
    assert.equal(planThatUnlocks("reactions"), "starter");
    assert.equal(planThatUnlocks("polls"), "professional");
    assert.equal(planThatUnlocks("transcriptExport"), "business");
  });

  test("new webinars start with the interaction switches on and still validate", () => {
    const config = createDefaultWorkflowConfig({ hostName: "H", hostEmail: "h@example.com", timezone: "Africa/Lagos" });
    assert.equal(config.live.chatEnabled, true);
    assert.equal(sectionSchemas.live.safeParse(config.live).success, true);
    const { pollsEnabled, reactionsEnabled, viewerCountEnabled, ...legacy } = config.live;
    void pollsEnabled; void reactionsEnabled; void viewerCountEnabled;
    assert.equal(sectionSchemas.live.safeParse(legacy).success, true, "stored webinars without the new flags still validate");
  });
});

describe("live text", () => {
  test("cleanText strips control and bidi characters, collapses spaces and caps length", () => {
    assert.equal(cleanText("  hi\u0000   there‮!  ", 50), "hi there !");
    assert.equal(cleanText("x".repeat(500), 300).length, 300);
    assert.equal(cleanText(42, 10), "");
  });
  test("public names show first name and last initial only", () => {
    assert.equal(publicName("Ada Lovelace"), "Ada L.");
    assert.equal(publicName("Madonna"), "Madonna");
    assert.equal(publicName("  "), "Guest");
    assert.equal(publicName("Jean Claude van Damme"), "Jean D.");
    assert.equal(initialsOf("Ada L."), "AL");
  });
});
