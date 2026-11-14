import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createUser, createWebinar, db, resetDatabase } from "./helpers";
import { createOrganizationWithOwner } from "../../src/server/db/organizations";

before(resetDatabase);
beforeEach(resetDatabase);
after(() => db.$disconnect());

describe("schema & migrations", () => {
  test("all application tables exist and have RLS enabled", async () => {
    const rows = await db.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
      SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'`;
    const names = rows.map((r) => r.relname);
    for (const t of ["users", "organizations", "memberships", "platform_admins", "webinars", "presenters", "webinar_sessions", "landing_pages", "registrations", "attendees", "payments", "payment_events", "subscriptions", "email_logs", "automation_jobs", "job_runs", "audit_logs", "analytics_events", "invitations"]) {
      assert.ok(names.includes(t), `missing table ${t}`);
    }
    assert.deepEqual(rows.filter((r) => !r.relrowsecurity).map((r) => r.relname), []);
  });

  test("organization creation makes the creator OWNER and writes an audit entry", async () => {
    const owner = await createUser("owner@example.com");
    const org = await createOrganizationWithOwner(db, owner, { name: "Acme Webinars!" });
    assert.equal(org.slug, "acme-webinars");
    const m = await db.membership.findFirstOrThrow({ where: { organizationId: org.id } });
    assert.equal(m.role, "OWNER");
    assert.equal(await db.auditLog.count({ where: { organizationId: org.id, action: "organization.create" } }), 1);
    const again = await createOrganizationWithOwner(db, owner, { name: "Acme Webinars" });
    assert.equal(again.slug, "acme-webinars-2");
  });
});

describe("database-level tenant integrity", () => {
  test("a registration cannot point at another organization's webinar", async () => {
    const a = await createOrganizationWithOwner(db, await createUser(), { name: "Org A" });
    const b = await createOrganizationWithOwner(db, await createUser(), { name: "Org B" });
    const webinarA = await createWebinar(a.id);
    await assert.rejects(
      db.registration.create({ data: { organizationId: b.id, webinarId: webinarA.id, email: "x@example.com", name: "X" } }),
      /Foreign key constraint/i,
    );
    const ok = await db.registration.create({ data: { organizationId: a.id, webinarId: webinarA.id, email: "x@example.com", name: "X" } });
    assert.equal(ok.organizationId, a.id);
  });

  test("presenters, sessions and landing pages are also tenant-locked to their webinar", async () => {
    const a = await createOrganizationWithOwner(db, await createUser(), { name: "Org A" });
    const b = await createOrganizationWithOwner(db, await createUser(), { name: "Org B" });
    const w = await createWebinar(a.id);
    await assert.rejects(db.presenter.create({ data: { organizationId: b.id, webinarId: w.id, name: "P" } }));
    await assert.rejects(db.landingPage.create({ data: { organizationId: b.id, webinarId: w.id, title: "LP" } }));
    await assert.rejects(
      db.webinarSession.create({ data: { organizationId: b.id, webinarId: w.id, sourceKey: "s1", startsAt: new Date(), endsAt: new Date(Date.now() + 3600e3), timezone: "UTC" } }),
    );
  });

  test("one registration per email per webinar; emails must be lower-case", async () => {
    const a = await createOrganizationWithOwner(db, await createUser(), { name: "Org A" });
    const w = await createWebinar(a.id);
    await db.registration.create({ data: { organizationId: a.id, webinarId: w.id, email: "ada@example.com", name: "Ada" } });
    await assert.rejects(db.registration.create({ data: { organizationId: a.id, webinarId: w.id, email: "ada@example.com", name: "Ada 2" } }), /Unique constraint/i);
    await assert.rejects(db.registration.create({ data: { organizationId: a.id, webinarId: w.id, email: "Bob@Example.com", name: "Bob" } }), /registrations_email_lowercase|check/i);
  });

  test("ticket and subscription payments cannot be mixed up", async () => {
    const a = await createOrganizationWithOwner(db, await createUser(), { name: "Org A" });
    const w = await createWebinar(a.id);
    const sub = await db.subscription.create({ data: { organizationId: a.id, plan: "STARTER", amount: 10000, currency: "NGN", provider: "FLUTTERWAVE" } });
    const base = { organizationId: a.id, provider: "FLUTTERWAVE" as const, amount: 5000, currency: "NGN" as const, customerEmail: "p@example.com" };
    await db.payment.create({ data: { ...base, purpose: "WEBINAR_TICKET", webinarId: w.id, txRef: "t1", idempotencyKey: "i1" } });
    await db.payment.create({ data: { ...base, purpose: "PLATFORM_SUBSCRIPTION", subscriptionId: sub.id, txRef: "t2", idempotencyKey: "i2" } });
    await assert.rejects(db.payment.create({ data: { ...base, purpose: "WEBINAR_TICKET", txRef: "t3", idempotencyKey: "i3" } }), /payments_purpose_links|check/i);
    await assert.rejects(db.payment.create({ data: { ...base, purpose: "PLATFORM_SUBSCRIPTION", webinarId: w.id, subscriptionId: sub.id, txRef: "t4", idempotencyKey: "i4" } }), /payments_purpose_links|check/i);
    await assert.rejects(db.payment.create({ data: { ...base, purpose: "WEBINAR_TICKET", webinarId: w.id, txRef: "t1", idempotencyKey: "i5" } }), /Unique constraint/i);
    await assert.rejects(db.payment.create({ data: { ...base, amount: 0, purpose: "WEBINAR_TICKET", webinarId: w.id, txRef: "t6", idempotencyKey: "i6" } }), /payments_amount_positive|check/i);
  });

  test("webinars with payments cannot be hard-deleted (financial history is kept)", async () => {
    const a = await createOrganizationWithOwner(db, await createUser(), { name: "Org A" });
    const w = await createWebinar(a.id);
    await db.payment.create({ data: { organizationId: a.id, provider: "FLUTTERWAVE", amount: 5000, currency: "NGN", customerEmail: "p@example.com", purpose: "WEBINAR_TICKET", webinarId: w.id, txRef: "t1", idempotencyKey: "i1" } });
    await assert.rejects(db.webinar.delete({ where: { id: w.id } }));
  });

  test("job and email dedupe keys prevent duplicates", async () => {
    await db.automationJob.create({ data: { type: "SEND_REMINDER", dedupeKey: "reminder:r1:24h" } });
    await assert.rejects(db.automationJob.create({ data: { type: "SEND_REMINDER", dedupeKey: "reminder:r1:24h" } }), /Unique constraint/i);
    await db.emailLog.create({ data: { template: "reminder", toEmail: "a@example.com", subject: "s", dedupeKey: "email:r1:24h" } });
    await assert.rejects(db.emailLog.create({ data: { template: "reminder", toEmail: "a@example.com", subject: "s", dedupeKey: "email:r1:24h" } }), /Unique constraint/i);
    await db.paymentEvent.create({ data: { provider: "FLUTTERWAVE", eventType: "charge.completed", dedupeKey: "flw:123", payload: {} } });
    await assert.rejects(db.paymentEvent.create({ data: { provider: "FLUTTERWAVE", eventType: "charge.completed", dedupeKey: "flw:123", payload: {} } }), /Unique constraint/i);
  });

  test("webinar slugs must be URL-safe and globally unique", async () => {
    const a = await createOrganizationWithOwner(db, await createUser(), { name: "Org A" });
    const b = await createOrganizationWithOwner(db, await createUser(), { name: "Org B" });
    await createWebinar(a.id, "growth-clinic");
    await assert.rejects(createWebinar(b.id, "growth-clinic"), /Unique constraint/i);
    await assert.rejects(createWebinar(a.id, "Bad Slug!"), /webinars_slug_format|check/i);
    assert.ok(randomUUID());
  });
});
