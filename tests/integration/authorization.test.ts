import { after, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createUser, createWebinar, db, resetDatabase, session } from "./helpers";
import { createOrganizationWithOwner } from "../../src/server/db/organizations";
import {
  AuthorizationError,
  bootstrapSuperAdmin,
  changeMemberRole,
  grantPlatformRole,
  listUserOrganizations,
  requireOrgPermission,
  requirePlatformPermission,
  requireTenantWebinar,
} from "../../src/server/auth/authorize";

beforeEach(resetDatabase);
after(() => db.$disconnect());

const status = (n: number) => (e: unknown) => e instanceof AuthorizationError && e.status === n;

async function orgWithMembers() {
  const owner = await createUser("owner@example.com");
  const org = await createOrganizationWithOwner(db, owner, { name: "Org A" });
  const editor = await createUser("editor@example.com");
  const analyst = await createUser("analyst@example.com");
  await db.membership.createMany({
    data: [
      { organizationId: org.id, userId: editor.id, role: "EDITOR" },
      { organizationId: org.id, userId: analyst.id, role: "ANALYST" },
    ],
  });
  return { org, owner, editor, analyst };
}

describe("organization authorization", () => {
  test("unauthenticated callers get 401", async () => {
    const { org } = await orgWithMembers();
    await assert.rejects(requireOrgPermission(db, null, org.id, "webinar.view"), status(401));
  });

  test("members get permissions from their role", async () => {
    const { org, owner, editor, analyst } = await orgWithMembers();
    assert.equal((await requireOrgPermission(db, session(owner), org.id, "org.billing.manage")).role, "OWNER");
    await requireOrgPermission(db, session(editor), org.id, "webinar.edit");
    await requireOrgPermission(db, session(analyst), org.id, "analytics.view");
    await assert.rejects(requireOrgPermission(db, session(analyst), org.id, "webinar.edit"), status(403));
    await assert.rejects(requireOrgPermission(db, session(editor), org.id, "org.members.manage"), status(403));
  });

  test("non-members get 404 (tenant existence is not revealed)", async () => {
    const { org } = await orgWithMembers();
    const outsider = await createUser("outsider@example.com");
    await createOrganizationWithOwner(db, outsider, { name: "Org B" });
    await assert.rejects(requireOrgPermission(db, session(outsider), org.id, "webinar.view"), status(404));
  });

  test("suspended users, suspended memberships and suspended orgs are denied", async () => {
    const { org, editor, analyst, owner } = await orgWithMembers();
    await db.user.update({ where: { id: editor.id }, data: { status: "SUSPENDED" } });
    await assert.rejects(requireOrgPermission(db, session(editor), org.id, "webinar.view"), status(403));
    await db.membership.update({ where: { organizationId_userId: { organizationId: org.id, userId: analyst.id } }, data: { status: "SUSPENDED" } });
    await assert.rejects(requireOrgPermission(db, session(analyst), org.id, "webinar.view"), status(404));
    await db.organization.update({ where: { id: org.id }, data: { status: "SUSPENDED" } });
    await assert.rejects(requireOrgPermission(db, session(owner), org.id, "webinar.view"), status(403));
  });

  test("webinars from another tenant are not reachable even with a valid id", async () => {
    const { org, owner } = await orgWithMembers();
    const other = await createUser("other@example.com");
    const orgB = await createOrganizationWithOwner(db, other, { name: "Org B" });
    const foreign = await createWebinar(orgB.id);
    const mine = await createWebinar(org.id);
    const ctx = await requireOrgPermission(db, session(owner), org.id, "webinar.view");
    assert.equal((await requireTenantWebinar(db, ctx, mine.id)).id, mine.id);
    await assert.rejects(requireTenantWebinar(db, ctx, foreign.id), status(404));
    await db.webinar.update({ where: { id: mine.id }, data: { deletedAt: new Date() } });
    await assert.rejects(requireTenantWebinar(db, ctx, mine.id), status(404));
  });

  test("listUserOrganizations returns only active memberships", async () => {
    const { owner } = await orgWithMembers();
    const orgs = await listUserOrganizations(db, owner.id);
    assert.deepEqual(orgs.map((m) => m.organization.slug), ["org-a"]);
  });
});

describe("role management guards", () => {
  test("members cannot change their own role or escalate others above themselves", async () => {
    const { org, owner, editor, analyst } = await orgWithMembers();
    const admin = await createUser("admin@example.com");
    await db.membership.create({ data: { organizationId: org.id, userId: admin.id, role: "ADMIN" } });
    const adminCtx = await requireOrgPermission(db, session(admin), org.id, "org.members.manage");
    await assert.rejects(changeMemberRole(db, adminCtx, admin.id, "OWNER"), status(403));
    await assert.rejects(changeMemberRole(db, adminCtx, analyst.id, "OWNER"), status(403));
    await assert.rejects(changeMemberRole(db, adminCtx, owner.id, "ANALYST"), status(403));
    assert.equal((await changeMemberRole(db, adminCtx, analyst.id, "EDITOR")).role, "EDITOR");
    const editorCtx = await requireOrgPermission(db, session(editor), org.id, "webinar.view");
    await assert.rejects(changeMemberRole(db, editorCtx, analyst.id, "ANALYST"), status(403));
    assert.equal(await db.auditLog.count({ where: { action: "membership.role_change" } }), 1);
  });

  test("the last owner cannot be demoted", async () => {
    const { org, owner } = await orgWithMembers();
    const owner2 = await createUser("owner2@example.com");
    await db.membership.create({ data: { organizationId: org.id, userId: owner2.id, role: "OWNER" } });
    const ctx2 = await requireOrgPermission(db, session(owner2), org.id, "org.members.manage");
    await changeMemberRole(db, ctx2, owner.id, "ADMIN");
    const ctx1 = await requireOrgPermission(db, session(owner), org.id, "org.view");
    await assert.rejects(changeMemberRole(db, ctx1, owner2.id, "ADMIN"), status(403));
  });
});

describe("platform administration", () => {
  test("organization owners have no platform access", async () => {
    const { owner } = await orgWithMembers();
    await assert.rejects(requirePlatformPermission(db, session(owner), "admin.dashboard.view"), status(404));
  });

  test("bootstrap only promotes the configured, verified email while no super admin exists", async () => {
    const env = { INITIAL_SUPER_ADMIN_EMAIL: "boss@example.com" };
    const boss = await createUser("boss@example.com");
    const other = await createUser("other@example.com");
    assert.equal(await bootstrapSuperAdmin(db, { ...boss, emailVerified: false }, env), false);
    assert.equal(await bootstrapSuperAdmin(db, { ...other, emailVerified: true }, env), false);
    assert.equal(await bootstrapSuperAdmin(db, { ...boss, emailVerified: true }, env), true);
    assert.equal(await bootstrapSuperAdmin(db, { ...boss, emailVerified: true }, env), false);
    const ctx = await requirePlatformPermission(db, session(boss), "admin.admins.manage");
    assert.equal(ctx.role, "SUPER_ADMIN");
    assert.equal(await bootstrapSuperAdmin(db, { ...boss, emailVerified: true }, {}), false);
  });

  test("users cannot grant themselves admin; only admins.manage holders can grant", async () => {
    const boss = await createUser("boss@example.com");
    await bootstrapSuperAdmin(db, { ...boss, emailVerified: true }, { INITIAL_SUPER_ADMIN_EMAIL: "boss@example.com" });
    const support = await createUser("support@example.com");
    const random = await createUser("random@example.com");
    await assert.rejects(grantPlatformRole(db, session(random), random.id, "SUPER_ADMIN"), status(403));
    await assert.rejects(grantPlatformRole(db, session(random), support.id, "SUPPORT_ADMIN"), status(404));
    await grantPlatformRole(db, session(boss), support.id, "SUPPORT_ADMIN");
    await assert.rejects(grantPlatformRole(db, session(support), random.id, "SUPER_ADMIN"), status(404));
    await assert.rejects(grantPlatformRole(db, session(boss), boss.id, "SUPPORT_ADMIN"), status(403));
    await requirePlatformPermission(db, session(support), "admin.users.view");
    await assert.rejects(requirePlatformPermission(db, session(support), "admin.database.maintenance"), status(404));
    assert.equal(await db.auditLog.count({ where: { action: "platform_admin.grant" } }), 1);
  });
});
