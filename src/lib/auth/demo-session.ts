import type { OrgRole } from "@/generated/prisma/enums";
import type { User } from "@/types";
import { getCurrentAppUser } from "@/server/auth/session";
import { orgRoleHasPermission, type OrgPermission } from "@/server/auth/permissions";

/**
 * Current user for server code written against the domain `User` type.
 *
 * - Supabase mode: verified Supabase session + Postgres profile + active organization
 *   (role re-read from the membership on every request).
 * - Demo mode (explicit NEXT_PUBLIC_DEMO_MODE=true, never on Vercel production): mock user.
 * - Otherwise: null (callers respond 401 / redirect).
 *
 * Never derive the user from client-supplied values.
 */
export async function getCurrentUser(): Promise<User | null> {
  return getCurrentAppUser();
}

/** Organization permission for the user's role in their active workspace. */
export function userCan(user: User, permission: OrgPermission): boolean {
  return orgRoleHasPermission(user.role.toUpperCase() as OrgRole, permission);
}

/** Same workspace + permission. Defaults to edit rights. */
export function canManageWebinar(user: User, webinar: { workspaceId: string }, permission: OrgPermission = "webinar.edit"): boolean {
  return user.workspaceId === webinar.workspaceId && userCan(user, permission);
}
