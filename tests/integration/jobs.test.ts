import { after, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createUser, db, resetDatabase } from "./helpers";
import { createOrganizationWithOwner } from "../../src/server/db/organizations";
import { claimJobs, enqueueJob, runDueJobs } from "../../src/server/jobs/queue";
import { JOB_HANDLERS, MAX_LATE_STARTING_MS, lifecycleStatus, planForRegistration, planNotifications, stillSendable, tick } from "../../src/server/jobs/automation";
import { prismaStore as store } from "../../src/server/repositories/prisma-store";
import { createDefaultWorkflowConfig } from "../../src/lib/webinar-workflow/defaults";
import { applyWorkflowToWebinar } from "../../src/lib/webinar-workflow/sync";
import type { Registration, Webinar, WebinarWorkflowConfig } from "../../src/types";

// Non-demo mode (emails go to the outbox; without SMTP they are logged as SKIPPED, which still dedupes).
Object.assign(process.env, {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", NEXT_PUBLIC_DEMO_MODE: "false",
  REGISTRATION_LINK_SECRET: "test-link-secret-0123456789abcdefghijkl", NEXT_PUBLIC_APP_URL: "https://app.example.test",
});
delete process.env.SMTP_HOST;
delete process.env.FLUTTERWAVE_SECRET_KEY;

beforeEach(resetDatabase);
after(() => db.$disconnect());

const pad = (n: number) => String(n).padStart(2, "0");
/** Local date/time strings in a zone for an instant. */
function local(at: Date, tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${pad(Number(p.hour))}:${p.minute}` };
}

async function setup(opts: { startsAt: Date; tz?: string; mode?: "schedule_later" | "right_now"; edit?: (c: WebinarWorkflowConfig) => void }) {
  const owner = await createUser();
  const org = await createOrganizationWithOwner(db, owner, { name: "Org" });
  const tz = opts.tz ?? "Africa/Lagos";
  const config = createDefaultWorkflowConfig({ hostName: "Host", hostEmail: "host@example.com", timezone: tz });
  const l = local(opts.startsAt, tz);
  config.configuration = { ...config.configuration, title: "Automation Clinic", description: "Automation test session.", mode: opts.mode ?? "schedule_later" };
  config.schedules = { ...config.schedules, timezone: tz, durationMinutes: 60, sessions: [{ id: "s1", date: l.date, time: l.time, status: "open" }] };
  config.notifications = {
    ...config.notifications,
    reminders: [{ ...config.notifications.reminders[0], id: "r60", minutesBefore: 60, enabled: true, subject: "Starts in 1 hour", body: "See you soon {{first_name}}" }],
    followUps: [],
  };
  config.integrations.video.url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  config.publishedAt = new Date(Date.now() - 3600e3).toISOString();
  opts.edit?.(config);
  const now = new Date().toISOString();
  const webinar = await store.createWebinar(applyWorkflowToWebinar({ id: "t", slug: `auto-${Math.random().toString(36).slice(2, 8)}`, title: "Automation Clinic", description: "", status: "scheduled", type: "live", workspaceId: org.id, ownerId: owner.id, videoSource: { id: "v", provider: "youtube", url: "", title: "", isEmbedded: true }, schedule: { id: "s", startsAt: now, timezone: tz }, attendeeCount: 0, registrationCount: 0, tags: [], createdAt: now, updatedAt: now }, config));
  const created = await store.createRegistration({ webinarId: webinar.id, name: "Ada Tester", email: `ada-${Math.random().toString(36).slice(2, 6)}@example.com`, registeredAt: new Date(Date.now() - 2 * 3600e3).toISOString(), source: "hosted", status: "registered", paymentStatus: "free", selectedSessionSlot: opts.startsAt.toISOString(), metadata: { sessionStartsAt: opts.startsAt.toISOString() } });
  if (created.status !== "created") throw new Error("registration");
  return { org, webinar: (await store.getWebinar(webinar.id))!, registration: created.registration };
}

describe("job queue", () => {
  test("a dedupe key enqueues once", async () => {
    assert.equal((await enqueueJob({ type: "x", dedupeKey: "k" })).status, "enqueued");
    assert.equal((await enqueueJob({ type: "x", dedupeKey: "k" })).status, "duplicate");
    assert.equal(await db.automationJob.count(), 1);
  });

  test("concurrent runners execute every job exactly once", async () => {
    for (let i = 0; i < 30; i++) await enqueueJob({ type: "count", payload: { i } });
    const seen: number[] = [];
    const handlers = { count: async (p: Record<string, unknown>) => { seen.push(Number(p.i)); await new Promise((r) => setTimeout(r, 5)); } };
    await Promise.all([runDueJobs(handlers, { batch: 4 }), runDueJobs(handlers, { batch: 4 }), runDueJobs(handlers, { batch: 4 })]);
    assert.equal(seen.length, 30);
    assert.equal(new Set(seen).size, 30);
    assert.equal(await db.automationJob.count({ where: { status: "SUCCEEDED" } }), 30);
    assert.equal(await db.jobRun.count({ where: { status: "SUCCEEDED" } }), 30);
  });

  test("failures retry with backoff and every attempt is logged", async () => {
    await enqueueJob({ type: "flaky", maxAttempts: 3 });
    let calls = 0;
    const handlers = { flaky: async () => { calls += 1; if (calls === 1) throw new Error("transient boom"); return { ok: true }; } };
    assert.deepEqual(await runDueJobs(handlers), { succeeded: 0, retry: 1, failed: 0 });
    let job = await db.automationJob.findFirstOrThrow();
    assert.equal(job.status, "PENDING");
    assert.equal(job.attempts, 1);
    assert.ok(job.runAt > new Date(Date.now() + 50_000), "backed off ~1 minute");
    assert.equal(job.lastError, "transient boom");
    assert.deepEqual(await runDueJobs(handlers), { succeeded: 0, retry: 0, failed: 0 }, "not due yet");
    await db.automationJob.update({ where: { id: job.id }, data: { runAt: new Date(Date.now() - 1000) } });
    assert.equal((await runDueJobs(handlers)).succeeded, 1);
    job = await db.automationJob.findFirstOrThrow();
    assert.equal(job.status, "SUCCEEDED");
    const runs = await db.jobRun.findMany({ orderBy: { attempt: "asc" } });
    assert.deepEqual(runs.map((r) => [r.attempt, r.status]), [[1, "FAILED"], [2, "SUCCEEDED"]]);
    assert.deepEqual(runs[1].output, { ok: true });
  });

  test("gives up after max attempts; unknown job types fail immediately", async () => {
    await enqueueJob({ type: "always", maxAttempts: 2 });
    await enqueueJob({ type: "nope" });
    const handlers = { always: async () => { throw new Error("broken"); } };
    await runDueJobs(handlers);
    await db.automationJob.updateMany({ where: { type: "always" }, data: { runAt: new Date(0) } });
    await runDueJobs(handlers);
    assert.equal((await db.automationJob.findFirstOrThrow({ where: { type: "always" } })).status, "FAILED");
    const unknown = await db.automationJob.findFirstOrThrow({ where: { type: "nope" } });
    assert.equal(unknown.status, "FAILED");
    assert.equal(unknown.attempts, 1);
  });

  test("a job whose worker died is reclaimed; on its last attempt it is failed", async () => {
    const a = await enqueueJob({ type: "ok", maxAttempts: 3 });
    const b = await enqueueJob({ type: "ok", maxAttempts: 1 });
    await db.automationJob.updateMany({ data: { status: "RUNNING", attempts: 1, lockedAt: new Date(Date.now() - 11 * 60_000), lockedBy: "dead" } });
    const claimed = await claimJobs(10, "w");
    assert.deepEqual(claimed.map((j) => j.id), [a.id]);
    assert.equal((await db.automationJob.findUniqueOrThrow({ where: { id: b.id! } })).status, "FAILED");
  });
});

describe("notification planning", () => {
  test("plans per registration; unpaid or cancelled registrations get nothing", async () => {
    const { webinar, registration } = await setup({ startsAt: new Date(Date.now() + 3 * 3600e3) });
    const items = planForRegistration(webinar, registration);
    const reminder = items.find((i) => i.kind === "reminder")!;
    assert.equal(reminder.dueAt.getTime(), Date.parse(registration.selectedSessionSlot!) - 3600e3);
    assert.ok(items.some((i) => i.kind === "thank_you"));
    assert.deepEqual(planForRegistration(webinar, { ...registration, paymentStatus: "pending" }), []);
    assert.deepEqual(planForRegistration(webinar, { ...registration, status: "cancelled" }), []);
  });

  test("time zones and DST: reminder instants follow the zone's real offset", async () => {
    // New York leaves DST on 2026-11-01; 09:00 on 2026-11-02 is 14:00Z, 09:00 on 2026-10-30 is 13:00Z.
    const after = await setup({ startsAt: new Date("2026-11-02T14:00:00Z"), tz: "America/New_York" });
    const s1 = after.webinar.workflow!.schedules.sessions[0];
    assert.deepEqual([s1.date, s1.time], ["2026-11-02", "09:00"]);
    assert.equal(planForRegistration(after.webinar, after.registration).find((i) => i.kind === "reminder")!.dueAt.toISOString(), "2026-11-02T13:00:00.000Z");
    const before = await setup({ startsAt: new Date("2026-10-30T13:00:00Z"), tz: "America/New_York" });
    assert.equal(before.webinar.workflow!.schedules.sessions[0].time, "09:00");
  });

  test("send-time rules: started sessions, late registrants, expired replays, very late follow-ups", async () => {
    const { webinar, registration } = await setup({ startsAt: new Date(Date.now() + 30 * 60_000), edit: (c) => { c.replay.enabled = true; c.notifications.replayEmail.enabled = true; c.replay.expiration = "days_after"; c.replay.expiresAfterDays = 1; } });
    const items = planForRegistration(webinar, registration);
    const reminder = items.find((i) => i.kind === "reminder")!;
    assert.equal(stillSendable(webinar, reminder, new Date()).ok, true, "30 minutes late but before the session");
    assert.equal(stillSendable(webinar, reminder, new Date(reminder.sessionStart.getTime() + 1000)).ok, false);
    assert.equal(stillSendable(webinar, { ...reminder, registeredAt: new Date(reminder.dueAt.getTime() + 1000) }, new Date()).ok, false);
    const replay = items.find((i) => i.kind === "replay")!;
    assert.equal(stillSendable(webinar, replay, new Date(replay.dueAt.getTime() + 3600e3)).ok, true);
    assert.equal(stillSendable(webinar, replay, new Date(replay.dueAt.getTime() + 2 * 86400e3)).ok, false, "replay expired");
    const thanks = items.find((i) => i.kind === "thank_you")!;
    assert.equal(stillSendable(webinar, thanks, new Date(thanks.dueAt.getTime() + 25 * 3600e3)).ok, false);
  });

  test("reminders are enqueued for their exact due time, run once, and send once", async () => {
    // Upcoming: due in ~10 minutes, inside the lookahead -> enqueued for exactly its due time.
    const soon = new Date(Math.ceil((Date.now() + 70 * 60_000) / 60_000) * 60_000);
    await setup({ startsAt: soon });
    assert.equal((await planNotifications()).planned, 1);
    const upcoming = await db.automationJob.findFirstOrThrow({ where: { type: "notification.send" } });
    assert.equal(upcoming.runAt.toISOString(), new Date(soon.getTime() - 3600e3).toISOString());
    assert.equal((await runDueJobs(JOB_HANDLERS)).succeeded, 0, "not due yet");

    // Due now (10 minutes ago, before the session) -> runs on this tick.
    const { registration } = await setup({ startsAt: new Date(Date.now() + 50 * 60_000) });
    assert.deepEqual(await planNotifications(), { planned: 1, duplicates: 1 }, "only the new reminder is enqueued");
    assert.deepEqual(await planNotifications(), { planned: 0, duplicates: 2 });
    assert.equal((await runDueJobs(JOB_HANDLERS)).succeeded, 1, "only the due one runs");
    const logs = await db.emailLog.findMany({ where: { registrationId: registration.id, template: "reminder_1h" } });
    assert.equal(logs.length, 1);
    assert.match(logs[0].dedupeKey ?? "", /^notify:/);
    // Even a forced re-run of the job can't send a second email.
    const job = await db.automationJob.findFirstOrThrow({ where: { type: "notification.send", payload: { path: ["registrationId"], equals: registration.id } } });
    await db.automationJob.update({ where: { id: job.id }, data: { status: "PENDING", runAt: new Date(0) } });
    await runDueJobs(JOB_HANDLERS);
    assert.equal(await db.emailLog.count({ where: { registrationId: registration.id, template: "reminder_1h" } }), 1);
  });

  test("schedule edits after planning: the old reminder is skipped, the new one is planned", async () => {
    const startsAt = new Date(Date.now() + 50 * 60_000);
    const { webinar, registration } = await setup({ startsAt });
    assert.equal((await planNotifications()).planned, 1);
    // Move the registration to a session two days later.
    const later = new Date(startsAt.getTime() + 2 * 86400e3);
    await store.updateRegistration(registration.id, { metadata: { ...registration.metadata, sessionStartsAt: later.toISOString() }, selectedSessionSlot: later.toISOString() });
    await db.automationJob.updateMany({ where: { type: "notification.send" }, data: { runAt: new Date(0) } });
    await runDueJobs(JOB_HANDLERS);
    const run = await db.jobRun.findFirstOrThrow();
    assert.deepEqual(run.output, { skipped: "no longer scheduled" });
    assert.equal(await db.emailLog.count({ where: { template: "reminder_1h" } }), 0);
    void webinar;
  });

  test("recurring sessions: each registrant's own occurrence drives the reminders", async () => {
    const first = new Date(Date.now() + 3 * 86400e3);
    const { webinar } = await setup({ startsAt: first, edit: (c) => { c.schedules.recurrence = { ...c.schedules.recurrence, enabled: true, pattern: "daily", interval: 1, occurrences: 5 }; } });
    const sessions = await db.webinarSession.findMany({ where: { webinarId: webinar.id }, orderBy: { startsAt: "asc" } });
    assert.equal(sessions.length, 5);
    const third = sessions[2].startsAt;
    const r = await store.createRegistration({ webinarId: webinar.id, name: "Rec", email: "rec@example.com", registeredAt: new Date().toISOString(), source: "hosted", status: "registered", paymentStatus: "free", selectedSessionSlot: third.toISOString(), metadata: { sessionStartsAt: third.toISOString() } });
    if (r.status !== "created") throw new Error("reg");
    const reminder = planForRegistration(webinar, r.registration).find((i) => i.kind === "reminder")!;
    assert.equal(reminder.dueAt.getTime(), third.getTime() - 3600e3);
  });
});

describe("maintenance", () => {
  test("webinar status follows the schedule without bumping the workflow version", async () => {
    const past = await setup({ startsAt: new Date(Date.now() - 5 * 3600e3) });
    const running = await setup({ startsAt: new Date(Date.now() - 10 * 60_000) });
    const future = await setup({ startsAt: new Date(Date.now() + 86400e3) });
    assert.equal(lifecycleStatus(past.webinar), "completed");
    assert.equal(lifecycleStatus(running.webinar), "live");
    assert.equal(lifecycleStatus(future.webinar), "scheduled");
    const versionBefore = past.webinar.workflow!.version;
    await enqueueJob({ type: "webinar.lifecycle" });
    await runDueJobs(JOB_HANDLERS);
    assert.equal((await store.getWebinar(past.webinar.id))!.status, "completed");
    assert.equal((await store.getWebinar(running.webinar.id))!.status, "live");
    assert.equal((await store.getWebinar(future.webinar.id))!.status, "scheduled");
    assert.equal((await store.getWebinar(past.webinar.id))!.workflow!.version, versionBefore);
    assert.deepEqual((await store.listWebinarsByStatus(past.org.id, "completed")).map((w) => w.id), [past.webinar.id]);
  });

  test("a right-now webinar completes after its duration", async () => {
    const { webinar } = await setup({ startsAt: new Date(), mode: "right_now", edit: (c) => { c.publishedAt = new Date(Date.now() - 2 * 3600e3).toISOString(); } });
    assert.equal(lifecycleStatus(webinar), "completed");
  });

  test("abandoned checkouts expire after 48 hours; expired plans drop to Free", async () => {
    const { org, webinar, registration } = await setup({ startsAt: new Date(Date.now() + 86400e3) });
    await db.registration.update({ where: { id: registration.id }, data: { paymentStatus: "PENDING" } });
    await db.payment.create({ data: { organizationId: org.id, purpose: "WEBINAR_TICKET", provider: "FLUTTERWAVE", amount: 10, currency: "NGN", txRef: "wbt_old", idempotencyKey: "old", customerEmail: "x@example.com", webinarId: webinar.id, registrationId: registration.id, checkoutUrl: "https://checkout.example/x", createdAt: new Date(Date.now() - 50 * 3600e3) } });
    await db.subscription.create({ data: { organizationId: org.id, plan: "STARTER", status: "ACTIVE", amount: 19, currency: "USD", provider: "FLUTTERWAVE", currentPeriodEnd: new Date(Date.now() - 60_000) } });
    await db.organization.update({ where: { id: org.id }, data: { plan: "STARTER" } });
    await enqueueJob({ type: "payments.reconcile" });
    await enqueueJob({ type: "subscriptions.expire" });
    await runDueJobs(JOB_HANDLERS);
    assert.equal((await db.payment.findUniqueOrThrow({ where: { txRef: "wbt_old" } })).status, "CANCELLED");
    assert.equal((await db.registration.findUniqueOrThrow({ where: { id: registration.id } })).paymentStatus, "FAILED");
    assert.equal((await db.subscription.findFirstOrThrow()).status, "EXPIRED");
    assert.equal((await db.organization.findUniqueOrThrow({ where: { id: org.id } })).plan, "FREE");
  });

  test("tick: overlapping ticks never duplicate maintenance work", async () => {
    const [a, b] = await Promise.all([tick({ budgetMs: 5_000 }), tick({ budgetMs: 5_000 })]);
    assert.equal(a.maintenanceEnqueued + b.maintenanceEnqueued, 6);
    assert.equal((await tick({ budgetMs: 5_000 })).maintenanceEnqueued, 0);
    assert.equal(await db.automationJob.count({ where: { status: "SUCCEEDED" } }), 6);
    assert.equal(await db.automationJob.count({ where: { status: { in: ["FAILED", "PENDING", "RUNNING"] } } }), 0);
  });
});

describe("starting-now email", () => {
  test("is planned for the exact start time, separately from the reminders", async () => {
    const startsAt = new Date(Date.now() + 3 * 3600e3);
    const { webinar, registration } = await setup({ startsAt });
    const items = planForRegistration(webinar, registration);
    const starting = items.find((i) => i.kind === "starting")!;
    assert.equal(starting.dueAt.getTime(), startsAt.getTime());
    assert.equal(starting.templateType, "starting_now");
    assert.notEqual(starting.key, items.find((i) => i.kind === "reminder")!.key);
    assert.match(starting.message.subject, /starting now/i);
    assert.match(starting.message.body, /\{\{join_link\}\}/);
  });

  test("older webinars without the setting get it by default; it can be switched off", async () => {
    const legacy = await setup({ startsAt: new Date(Date.now() + 3 * 3600e3), edit: (c) => { delete (c.notifications as { startingEmail?: unknown }).startingEmail; } });
    assert.ok(planForRegistration(legacy.webinar, legacy.registration).some((i) => i.kind === "starting"));
    const off = await setup({ startsAt: new Date(Date.now() + 3 * 3600e3), edit: (c) => { c.notifications.startingEmail = { ...c.notifications.startingEmail!, enabled: false }; } });
    assert.ok(!planForRegistration(off.webinar, off.registration).some((i) => i.kind === "starting"));
  });

  test("send rules: not early, short grace after the start, never for late registrants", async () => {
    const { webinar, registration } = await setup({ startsAt: new Date(Date.now() + 3 * 3600e3) });
    const starting = planForRegistration(webinar, registration).find((i) => i.kind === "starting")!;
    assert.equal(stillSendable(webinar, starting, new Date(starting.dueAt.getTime() - 1000)).ok, false, "not before the start");
    assert.equal(stillSendable(webinar, starting, starting.dueAt).ok, true, "exactly at the start");
    assert.equal(stillSendable(webinar, starting, new Date(starting.dueAt.getTime() + MAX_LATE_STARTING_MS)).ok, true);
    assert.equal(stillSendable(webinar, starting, new Date(starting.dueAt.getTime() + MAX_LATE_STARTING_MS + 1000)).ok, false, "too late to be useful");
    assert.equal(stillSendable(webinar, { ...starting, registeredAt: new Date(starting.dueAt.getTime() + 1000) }, starting.dueAt).ok, false, "joined after the start");
  });

  test("goes out at the start time, once, in addition to the reminder", async () => {
    // The session started 2 minutes ago, so the starting email is due now. The 1-hour reminder is long past.
    const { registration } = await setup({ startsAt: new Date(Date.now() - 2 * 60_000) });
    const planned = await planNotifications();
    assert.equal(planned.planned, 1, "only the starting email is still worth sending");
    assert.equal((await runDueJobs(JOB_HANDLERS)).succeeded, 1);
    const logs = await db.emailLog.findMany({ where: { registrationId: registration.id } });
    assert.deepEqual(logs.map((l) => l.template), ["starting_now"]);
    assert.match(logs[0].dedupeKey ?? "", /:starting$/);
    assert.match(logs[0].subject, /starting now/i);
    await planNotifications();
    await runDueJobs(JOB_HANDLERS);
    assert.equal(await db.emailLog.count({ where: { registrationId: registration.id, template: "starting_now" } }), 1, "never twice");
  });

  test("not sent when the session is rescheduled after planning", async () => {
    const startsAt = new Date(Date.now() - 60_000);
    const { registration } = await setup({ startsAt });
    assert.equal((await planNotifications()).planned, 1);
    const later = new Date(Date.now() + 2 * 86400e3);
    await store.updateRegistration(registration.id, { metadata: { ...registration.metadata, sessionStartsAt: later.toISOString() }, selectedSessionSlot: later.toISOString() });
    await runDueJobs(JOB_HANDLERS);
    assert.equal(await db.emailLog.count({ where: { template: "starting_now" } }), 0);
  });
});
