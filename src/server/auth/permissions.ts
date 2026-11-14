import type { OrgRole, PlatformRole } from "@/generated/prisma/client";
import { ADMIN_PERMISSION_MATRIX, type AdminPermission, type AdminRole } from "@/lib/admin/permissions";

/**
 * Organization (tenant) permissions. Organization roles never grant platform
 * administration; platform access comes only from the platform_admins table.
 */
export type OrgPermission =
  | "org.view"
  | "org.settings.manage"
  | "org.billing.manage"
  | "org.members.view"
  | "org.members.manage"
  | "webinar.view"
  | "webinar.create"
  | "webinar.edit"
  | "webinar.publish"
  | "webinar.delete"
  | "registration.view"
  | "registration.manage"
  | "registration.export"
  | "analytics.view"
  | "payment.view"
  | "email.manage";

const ALL: OrgPermission[] = [
  "org.view",
  "org.settings.manage",
  "org.billing.manage",
  "org.members.view",
  "org.members.manage",
  "webinar.view",
  "webinar.create",
  "webinar.edit",
  "webinar.publish",
  "webinar.delete",
  "registration.view",
  "registration.manage",
  "registration.export",
  "analytics.view",
  "payment.view",
  "email.manage",
];

export const ORG_ROLE_PERMISSIONS: Record<OrgRole, readonly OrgPermission[]> = {
  OWNER: ALL,
  ADMIN: ALL.filter((p) => p !== "org.billing.manage"),
  EDITOR: ["org.view", "org.members.view", "webinar.view", "webinar.create", "webinar.edit", "webinar.publish", "registration.view", "registration.manage", "analytics.view", "email.manage"],
  HOST: ["org.view", "webinar.view", "webinar.edit", "registration.view", "analytics.view"],
  ANALYST: ["org.view", "webinar.view", "registration.view", "registration.export", "analytics.view", "payment.view"],
};

export function orgRoleHasPermission(role: OrgRole, permission: OrgPermission): boolean {
  return ORG_ROLE_PERMISSIONS[role].includes(permission);
}

/** Roles a member may assign: never above their own, and only owners create owners. */
export function canAssignOrgRole(actorRole: OrgRole, targetRole: OrgRole): boolean {
  const rank: Record<OrgRole, number> = { OWNER: 5, ADMIN: 4, EDITOR: 3, HOST: 2, ANALYST: 1 };
  if (targetRole === "OWNER") return actorRole === "OWNER";
  return rank[actorRole] >= rank[targetRole] && orgRoleHasPermission(actorRole, "org.members.manage");
}

// Platform roles reuse the existing admin permission matrix (src/lib/admin/permissions.ts).
const PLATFORM_TO_ADMIN_ROLE: Record<PlatformRole, AdminRole> = {
  SUPER_ADMIN: "super-admin",
  PLATFORM_ADMIN: "platform-admin",
  SUPPORT_ADMIN: "support-admin",
  FINANCE_ADMIN: "finance-admin",
  TECHNICAL_ADMIN: "technical-admin",
};

export function platformRoleHasPermission(role: PlatformRole, permission: AdminPermission): boolean {
  return ADMIN_PERMISSION_MATRIX[PLATFORM_TO_ADMIN_ROLE[role]].includes(permission);
}
