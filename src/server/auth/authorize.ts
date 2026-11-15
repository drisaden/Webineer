import type { Membership, OrgRole, PlatformRole, Prisma } from "@/generated/prisma/client";
import type { AdminPermission } from "@/lib/admin/permissions";
import type { Db } from "@/server/db/prisma";
import { canAssignOrgRole, orgRoleHasPermission, platformRoleHasPermission, type OrgPermission } from "./permissions";

type DbClient = Db | Prisma.TransactionClient;

export class AuthorizationError extends Error {
  constructor(
    message: string,
    /** 401 unauthenticated, 403 forbidden, 404 hidden (don't reveal other tenants' records). */
    public readonly status: 401 | 403 | 404,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Identity established from a verified Supabase session (Phase 2). Never from client input. */
export interface SessionUser {
  id: string;
  email: string;
}

export interface OrgContext {
  user: SessionUser;
  organizationId: string;
  role: OrgRole;
  membership: Membership;
}

/** Active user profile or 401. Suspended/deactivated accounts are rejected. */
export async function requireActiveUser(db: DbClient, user: SessionUser | null | undefined) {
  if (!user) throw new AuthorizationError("Sign in to continue.", 401);
  const profile = await db.user.findUnique({ where: { id: user.id } });
  if (!profile || profile.status !== "ACTIVE") throw new AuthorizationError("Your account is not active.", 403);
  return profile;
}

/**
 * Resolve the caller's membership in an organization and check a permission.
 * Non-members get 404 so organization ids can't be probed.
 */
export async function requireOrgPermission(
  db: DbClient,
  user: SessionUser | null | undefined,
  organizationId: string,
  permission: OrgPermission,
): Promise<OrgContext> {
  await requireActiveUser(db, user);
  const membership = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId: user!.id } },
    include: { organization: { select: { status: true, deletedAt: true } } },
  });
  if (!membership || membership.status !== "ACTIVE" || membership.organization.deletedAt) {
    throw new AuthorizationError("Organization not found.", 404);
  }
  if (membership.organization.status !== "ACTIVE") {
    throw new AuthorizationError("This organization is suspended.", 403);
  }
  if (!orgRoleHasPermission(membership.role, permission)) {
    throw new AuthorizationError("You don't have permission to do that.", 403);
  }
  const { organization: _org, ...plain } = membership;
  return { user: user!, organizationId, role: membership.role, membership: plain };
}

/** Organizations the user can act in (for org switchers / default org selection). */
export async function listUserOrganizations(db: DbClient, userId: string) {
  return db.membership.findMany({
    where: { userId, status: "ACTIVE", organization: { status: "ACTIVE", deletedAt: null } },
    include: { organization: { select: { id: true, name: true, slug: true, plan: true, planSelectedAt: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/** Tenant filter that every tenant-owned query must include. */
export function tenantWhere(ctx: Pick<OrgContext, "organizationId">) {
  return { organizationId: ctx.organizationId } as const;
}

/**
 * Load a webinar inside the caller's tenant. A webinar from another
 * organization is indistinguishable from a missing one (404).
 */
export async function requireTenantWebinar(db: DbClient, ctx: OrgContext, webinarId: string) {
  const webinar = await db.webinar.findFirst({ where: { id: webinarId, ...tenantWhere(ctx), deletedAt: null } });
  if (!webinar) throw new AuthorizationError("Webinar not found.", 404);
  return webinar;
}

// ---------------------------------------------------------------------------
// Platform administration
// ---------------------------------------------------------------------------

export async function getPlatformRole(db: DbClient, userId: string): Promise<PlatformRole | null> {
  const admin = await db.platformAdmin.findUnique({ where: { userId } });
  return admin && !admin.revokedAt ? admin.role : null;
}

export async function requirePlatformPermission(db: DbClient, user: SessionUser | null | undefined, permission: AdminPermission) {
  await requireActiveUser(db, user);
  const role = await getPlatformRole(db, user!.id);
  // 404 rather than 403 so the admin area isn't discoverable.
  if (!role || !platformRoleHasPermission(role, permission)) throw new AuthorizationError("Not found.", 404);
  return { user: user!, role };
}

/**
 * Grant or change a platform role. Requires `admin.admins.manage`, and an
 * admin can never change their own role (no self-escalation).
 */
export async function grantPlatformRole(db: Db, actor: SessionUser, targetUserId: string, role: PlatformRole) {
  if (actor.id === targetUserId) throw new AuthorizationError("You can't change your own platform role.", 403);
  await requirePlatformPermission(db, actor, "admin.admins.manage");
  const target = await db.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new AuthorizationError("User not found.", 404);
  return db.$transaction(async (tx) => {
    const admin = await tx.platformAdmin.upsert({
      where: { userId: targetUserId },
      create: { userId: targetUserId, role, grantedById: actor.id },
      update: { role, grantedById: actor.id, revokedAt: null },
    });
    await tx.auditLog.create({
      data: { actorUserId: actor.id, actorEmail: actor.email, action: "platform_admin.grant", targetType: "user", targetId: targetUserId, metadata: { role } },
    });
    return admin;
  });
}

/**
 * First-run bootstrap: the user whose verified email equals
 * INITIAL_SUPER_ADMIN_EMAIL becomes super admin, but only while no active
 * super admin exists. Runs server-side after sign-in; there is no API to call it.
 */
export async function bootstrapSuperAdmin(db: Db, user: { id: string; email: string; emailVerified: boolean }, env: Record<string, string | undefined> = process.env) {
  const configured = env.INITIAL_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configured || !user.emailVerified || user.email.toLowerCase() !== configured) return false;
  return db.$transaction(async (tx) => {
    const existing = await tx.platformAdmin.count({ where: { role: "SUPER_ADMIN", revokedAt: null } });
    if (existing > 0) return false;
    await tx.platformAdmin.upsert({
      where: { userId: user.id },
      create: { userId: user.id, role: "SUPER_ADMIN" },
      update: { role: "SUPER_ADMIN", revokedAt: null },
    });
    await tx.auditLog.create({ data: { actorUserId: user.id, actorEmail: user.email, action: "platform_admin.bootstrap", targetType: "user", targetId: user.id } });
    return true;
  });
}

// ---------------------------------------------------------------------------
// Organization membership management
// ---------------------------------------------------------------------------

/** Change a member's role within the caller's organization, with escalation guards. */
export async function changeMemberRole(db: Db, ctx: OrgContext, targetUserId: string, newRole: OrgRole) {
  if (ctx.user.id === targetUserId) throw new AuthorizationError("You can't change your own role.", 403);
  if (!orgRoleHasPermission(ctx.role, "org.members.manage") || !canAssignOrgRole(ctx.role, newRole)) {
    throw new AuthorizationError("You can't assign that role.", 403);
  }
  return db.$transaction(async (tx) => {
    const target = await tx.membership.findUnique({ where: { organizationId_userId: { organizationId: ctx.organizationId, userId: targetUserId } } });
    if (!target) throw new AuthorizationError("Member not found.", 404);
    if (target.role === "OWNER" && ctx.role !== "OWNER") throw new AuthorizationError("Only owners can change an owner's role.", 403);
    if (target.role === "OWNER" && newRole !== "OWNER") {
      const owners = await tx.membership.count({ where: { organizationId: ctx.organizationId, role: "OWNER", status: "ACTIVE" } });
      if (owners <= 1) throw new AuthorizationError("An organization must keep at least one owner.", 403);
    }
    const updated = await tx.membership.update({ where: { id: target.id }, data: { role: newRole } });
    await tx.auditLog.create({
      data: { organizationId: ctx.organizationId, actorUserId: ctx.user.id, actorEmail: ctx.user.email, action: "membership.role_change", targetType: "user", targetId: targetUserId, metadata: { from: target.role, to: newRole } },
    });
    return updated;
  });
}
