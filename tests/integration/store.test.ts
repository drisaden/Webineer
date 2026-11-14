import { after, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createUser, db, resetDatabase } from "./helpers";
import { createOrganizationWithOwner } from "../../src/server/db/organizations";
import { prismaStore as store } from "../../src/server/repositories/prisma-store";
import { ConcurrencyError } from "../../src/server/repositories/types";
import { createDefaultWorkflowConfig } from "../../src/lib/webinar-workflow/defaults";
import { applyWorkflowToWebinar } from "../../src/lib/webinar-workflow/sync";
import type { Registration, Webinar } from "../../src/types";

beforeEach(resetDatabase);
after(() => db.$disconnect());

const future = new Date(Date.now() + 10 * 86400e3).toISOString().slice(0, 10);

async function setup() {
  const owner = await createUser();
  const org = await createOrganizationWithOwner(db, owner, { name: "Org A" });
  return { owner, org };
}

function draftWebinar(orgId: string, ownerId: string, slug = "growth-clinic"): Webinar {
  const config = createDefaultWorkflowConfig({ hostName: "Host", hostEmail: "host@example.com", timezone: "Africa/Lagos" });
  config.configuration = { ...config.configuration, title: "Growth Clinic", description: "Practical growth session.", mode: "schedule_later", presenters: [{ id: "p1", name: "Ada", title: "CEO", bio: "", avatarUrl: "" }, { id: "p2", name: "", title: "", bio: "", avatarUrl: "" }] };
  config.schedules.sessions = [{ id: "s1", date: future, time: "18:00", status: "open" }, { id: "s2", date: future, time: "20:00", status: "open" }];
  config.integrations.video.url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  config.registration.headline = "Join the clinic";
  const now = new Date().toISOString();
  return applyWorkflowToWebinar(
    { id: "temp", slug, title: "Growth Clinic", description: "", status: "draft", type: "live", workspaceId: orgId, ownerId, videoSource: { id: "v", provider: "youtube", url: "", title: "", isEmbedded: true }, schedule: { id: "s", startsAt: now, timezone: "Africa/Lagos" }, attendeeCount: 0, registrationCount: 0, tags: [], createdAt: now, updatedAt: now },
    config,
  );
}

function reg(webinarId: string, email: string, extra: Partial<Registration> = {}): Omit<Registration, "id"> {
  return { webinarId, name: "Person", email, registeredAt: new Date().toISOString(), source: "inline", status: "registered", paymentStatus: "free", metadata: { phone: "+2348000000000", answers: { role: "Founder" }, accessKey: "must-not-be-stored" }, ...extra };
}

describe("webinars", () => {
  test("create + read round-trips the domain model; workflow is the source of truth", async () => {
    const { owner, org } = await setup();
    const created = await store.createWebinar(draftWebinar(org.id, owner.id));
    assert.match(created.id, /^[0-9a-f-]{36}$/);
    const read = await store.getWebinar(created.id);
    assert.equal(read?.title, "Growth Clinic");
    assert.equal(read?.workspaceId, org.id);
    assert.equal(read?.workflow?.configuration.mode, "schedule_later");
    assert.equal(read?.videoSource.url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(read?.schedule.sessionSlots?.length, 2);
    assert.equal((await store.getWebinarBySlug("growth-clinic"))?.id, created.id);
    assert.equal((await store.getWebinarByPublicId(created.workflow!.publicId))?.id, created.id);
    assert.equal(await store.getWebinar("not-a-uuid"), undefined);
  });

  test("presenters, sessions and the landing page row are synced from the workflow", async () => {
    const { owner, org } = await setup();
    const w = await store.createWebinar(draftWebinar(org.id, owner.id));
    assert.deepEqual((await db.presenter.findMany({ where: { webinarId: w.id } })).map((p) => p.name), ["Ada"]);
    assert.equal(await db.webinarSession.count({ where: { webinarId: w.id } }), 2);
    const page = await db.landingPage.findFirstOrThrow({ where: { webinarId: w.id } });
    assert.equal(page.title, "Join the clinic");
    assert.equal(page.status, "DRAFT");
    const next = structuredClone(w.workflow!);
    next.schedules.sessions = [next.schedules.sessions[0]];
    next.configuration.presenters = [];
    await store.updateWebinar(applyWorkflowToWebinar({ ...w, status: "scheduled" }, next));
    assert.equal(await db.webinarSession.count({ where: { webinarId: w.id } }), 1);
    assert.equal(await db.presenter.count({ where: { webinarId: w.id } }), 0);
    assert.equal((await db.landingPage.findFirstOrThrow({ where: { webinarId: w.id } })).status, "PUBLISHED");
  });

  test("optimistic concurrency rejects stale versions", async () => {
    const { owner, org } = await setup();
    const w = await store.createWebinar(draftWebinar(org.id, owner.id));
    const v1 = w.workflow!.version;
    const next = { ...w.workflow!, version: v1 + 1 };
    await store.updateWebinar({ ...w, workflow: next }, { expectedVersion: v1 });
    await assert.rejects(store.updateWebinar({ ...w, workflow: { ...next, version: v1 + 2 } }, { expectedVersion: v1 }), ConcurrencyError);
  });

  test("updates can never move a webinar to another organization", async () => {
    const { owner, org } = await setup();
    const other = await createOrganizationWithOwner(db, await createUser(), { name: "Org B" });
    const w = await store.createWebinar(draftWebinar(org.id, owner.id));
    await assert.rejects(store.updateWebinar({ ...w, workspaceId: other.id }));
    assert.equal((await store.getWebinar(w.id))?.workspaceId, org.id);
  });

  test("listing is tenant-scoped; soft delete hides the webinar but keeps its slug reserved", async () => {
    const { owner, org } = await setup();
    const bOwner = await createUser();
    const orgB = await createOrganizationWithOwner(db, bOwner, { name: "Org B" });
    const a = await store.createWebinar(draftWebinar(org.id, owner.id, "a-webinar"));
    await store.createWebinar(draftWebinar(orgB.id, bOwner.id, "b-webinar"));
    assert.deepEqual((await store.listWebinars(org.id)).map((w) => w.slug), ["a-webinar"]);
    await store.softDeleteWebinar(a.id);
    assert.equal(await store.getWebinar(a.id), undefined);
    assert.equal(await store.getWebinarBySlug("a-webinar"), undefined);
    assert.deepEqual(await store.listWebinars(org.id), []);
    assert.equal(await store.isSlugTaken("a-webinar"), true);
  });
});

describe("registrations", () => {
  test("create maps structured fields to columns and never stores access keys", async () => {
    const { owner, org } = await setup();
    const w = await store.createWebinar(draftWebinar(org.id, owner.id));
    const slot = w.schedule.sessionSlots![1];
    const r = await store.createRegistration(reg(w.id, "Ada@Example.com", { selectedSessionSlot: slot }));
    assert.equal(r.status, "created");
    const row = await db.registration.findFirstOrThrow({ where: { webinarId: w.id } });
    assert.equal(row.email, "ada@example.com");
    assert.equal(row.phone, "+2348000000000");
    assert.deepEqual(row.answers, { role: "Founder" });
    assert.equal(row.source, "INLINE");
    assert.ok(!JSON.stringify(row.metadata ?? {}).includes("must-not-be-stored"));
    const session = await db.webinarSession.findUniqueOrThrow({ where: { id: row.sessionId! } });
    assert.equal(session.startsAt.toISOString(), slot);
    assert.equal((await store.getWebinar(w.id))?.registrationCount, 1);
  });

  test("duplicates are reported, cancelled registrations can re-register", async () => {
    const { owner, org } = await setup();
    const w = await store.createWebinar(draftWebinar(org.id, owner.id));
    const first = await store.createRegistration(reg(w.id, "bo@example.com"));
    assert.equal((await store.createRegistration(reg(w.id, "bo@example.com"))).status, "duplicate");
    assert.equal(first.status, "created");
    if (first.status !== "created") return;
    await store.updateRegistration(first.registration.id, { status: "cancelled" });
    assert.equal(await store.findRegistrationByEmail(w.id, "bo@example.com"), undefined);
    const again = await store.createRegistration(reg(w.id, "bo@example.com"));
    assert.equal(again.status, "created");
    assert.equal(await db.registration.count({ where: { webinarId: w.id } }), 1);
  });

  test("capacity holds under 20 concurrent registrations", async () => {
    const { owner, org } = await setup();
    const w = await store.createWebinar(draftWebinar(org.id, owner.id));
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => store.createRegistration(reg(w.id, `p${i}@example.com`), { capacity: 5 })));
    assert.equal(results.filter((r) => r.status === "created").length, 5);
    assert.equal(results.filter((r) => r.status === "full").length, 15);
    assert.equal(await store.countActiveRegistrations(w.id), 5);
    assert.equal((await store.getWebinar(w.id))?.registrationCount, 5);
  });

  test("unpaid checkouts hold a seat for 30 minutes only; failed ones never", async () => {
    const { owner, org } = await setup();
    const w = await store.createWebinar(draftWebinar(org.id, owner.id));
    const pending = await store.createRegistration(reg(w.id, "p1@example.com", { paymentStatus: "pending" }), { capacity: 2 });
    await store.createRegistration(reg(w.id, "p2@example.com", { paymentStatus: "pending" }), { capacity: 2 });
    assert.equal((await store.createRegistration(reg(w.id, "p3@example.com"), { capacity: 2 })).status, "full");
    if (pending.status !== "created") throw new Error("expected created");
    await db.registration.update({ where: { id: pending.registration.id }, data: { registeredAt: new Date(Date.now() - 31 * 60 * 1000) } });
    assert.equal(await store.countActiveRegistrations(w.id), 1);
    assert.equal((await store.createRegistration(reg(w.id, "p3@example.com"), { capacity: 2 })).status, "created");
    await db.registration.updateMany({ where: { webinarId: w.id, email: "p2@example.com" }, data: { paymentStatus: "FAILED" } });
    assert.equal(await store.countActiveRegistrations(w.id), 1);
  });

  test("concurrent duplicate submissions create one registration", async () => {
    const { owner, org } = await setup();
    const w = await store.createWebinar(draftWebinar(org.id, owner.id));
    const results = await Promise.all(Array.from({ length: 8 }, () => store.createRegistration(reg(w.id, "same@example.com"))));
    assert.equal(results.filter((r) => r.status === "created").length, 1);
    assert.equal(await db.registration.count({ where: { webinarId: w.id } }), 1);
  });

  test("updateRegistration preserves email and merges metadata", async () => {
    const { owner, org } = await setup();
    const w = await store.createWebinar(draftWebinar(org.id, owner.id));
    const r = await store.createRegistration(reg(w.id, "cy@example.com", { paymentStatus: "pending" }));
    if (r.status !== "created") throw new Error("expected created");
    const updated = await store.updateRegistration(r.registration.id, { paymentStatus: "paid", transactionId: "tx_123", email: "evil@example.com" });
    assert.equal(updated?.paymentStatus, "paid");
    assert.equal(updated?.transactionId, "tx_123");
    assert.equal(updated?.email, "cy@example.com");
    assert.deepEqual(updated?.metadata?.answers, { role: "Founder" });
  });

  test("workspace registration listing is tenant-scoped", async () => {
    const { owner, org } = await setup();
    const bOwner = await createUser();
    const orgB = await createOrganizationWithOwner(db, bOwner, { name: "Org B" });
    const a = await store.createWebinar(draftWebinar(org.id, owner.id, "a-webinar"));
    const b = await store.createWebinar(draftWebinar(orgB.id, bOwner.id, "b-webinar"));
    await store.createRegistration(reg(a.id, "a@example.com"));
    await store.createRegistration(reg(b.id, "b@example.com"));
    const listA = await store.listWorkspaceRegistrations(org.id);
    assert.deepEqual(listA.map((r) => [r.email, r.webinarTitle]), [["a@example.com", "Growth Clinic"]]);
  });
});

describe("analytics & attendance", () => {
  test("registration funnel aggregates events by source", async () => {
    const { owner, org } = await setup();
    const w = await store.createWebinar(draftWebinar(org.id, owner.id));
    const ev = (eventType: "landing_page_viewed" | "registration_started" | "registration_completed", source: string) => store.recordEvent({ workspaceId: org.id, webinarId: w.id, eventType, source });
    await Promise.all([ev("landing_page_viewed", "hosted"), ev("landing_page_viewed", "hosted"), ev("landing_page_viewed", "inline"), ev("landing_page_viewed", "inline"), ev("registration_started", "inline"), ev("registration_completed", "inline")]);
    const f = await store.getRegistrationFunnel(w.id);
    assert.equal(f.pageViews, 4);
    assert.equal(f.submissions, 1);
    assert.equal(f.successfulRegistrations, 1);
    assert.equal(f.conversionRate, 25);
    assert.deepEqual(f.bySource.inline, { views: 2, registrations: 1 });
  });

  test("attendance creates attendee rows and counts each registrant once", async () => {
    const { owner, org } = await setup();
    const w = await store.createWebinar(draftWebinar(org.id, owner.id));
    const r = await store.createRegistration(reg(w.id, "dee@example.com"));
    if (r.status !== "created") throw new Error("expected created");
    await store.recordAttendance({ workspaceId: org.id, webinarId: w.id, registrationId: r.registration.id });
    await store.recordAttendance({ workspaceId: org.id, webinarId: w.id, registrationId: r.registration.id });
    assert.equal(await db.attendee.count({ where: { webinarId: w.id } }), 2);
    assert.equal((await store.getWebinar(w.id))?.attendeeCount, 1);
  });
});
