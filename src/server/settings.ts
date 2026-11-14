import { z } from "zod";
import type { OrgRole } from "@/generated/prisma/enums";
import { getAuthMode } from "@/lib/supabase/config";
import { isValidTimeZone } from "@/lib/webinar-workflow/time";
import { audit } from "@/server/audit";
import { AuthorizationError, changeMemberRole, requireOrgPermission, type SessionUser } from "@/server/auth/authorize";
import { getAppSession, getSessionUser } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  title: z.string().trim().max(120).default(""),
});

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Enter a workspace name.").max(80),
  timezone: z.string().refine(isValidTimeZone, "Choose a valid timezone."),
});

export const memberRoleSchema = z.object({ role: z.enum(["OWNER", "ADMIN", "EDITOR", "HOST", "ANALYST"]) });

export interface SettingsData {
  mode: "supabase" | "demo";
  profile: { name: string; title: string; email: string };
  organization: { id: string; name: string; timezone: string; slug: string };
  role: OrgRole;
  canManageSettings: boolean;
  canManageMembers: boolean;
  members: { userId: string; name: string; email: string; role: OrgRole; status: string; isSelf: boolean }[];
}

export async function getSettingsData(): Promise<SettingsData | null> {
  if (getAuthMode() === "demo") {
    return {
      mode: "demo",
      profile: { name: "Avery Morgan", title: "Product Marketing Lead", email: "avery@northstarstudio.co" },
      organization: { id: "ws_001", name: "Northstar Studio", timezone: "America/New_York", slug: "northstar-studio" },
      role: "OWNER",
      canManageSettings: false,
      canManageMembers: false,
      members: [{ userId: "usr_001", name: "Avery Morgan", email: "avery@northstarstudio.co", role: "OWNER", status: "ACTIVE", isSelf: true }],
    };
  }
  const app = await getAppSession();
  if (!app) return null;
  const db = getPrisma();
  const [org, memberships] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: app.organization.id }, select: { id: true, name: true, timezone: true, slug: true } }),
    db.membership.findMany({ where: { organizationId: app.organization.id }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } }),
  ]);
  const can = (p: Parameters<typeof requireOrgPermission>[3]) => requireOrgPermission(db, app.session, org.id, p).then(() => true, () => false);
  return {
    mode: "supabase",
    profile: { name: app.profile.name, title: app.profile.title ?? "", email: app.profile.email },
    organization: org,
    role: app.role,
    canManageSettings: await can("org.settings.manage"),
    canManageMembers: await can("org.members.manage"),
    members: memberships.map((m) => ({ userId: m.userId, name: m.user.name || m.user.email, email: m.user.email, role: m.role, status: m.status, isSelf: m.userId === app.profile.id })),
  };
}

/** Resolve the caller and their active organization for settings mutations. */
export async function settingsContext(permission: Parameters<typeof requireOrgPermission>[3]) {
  if (getAuthMode() !== "supabase") throw new AuthorizationError("Settings can't be changed in demo mode.", 403);
  const session: SessionUser | null = await getSessionUser();
  const app = await getAppSession();
  if (!session || !app) throw new AuthorizationError("Sign in to continue.", 401);
  return requireOrgPermission(getPrisma(), session, app.organization.id, permission);
}

export async function updateOrganization(input: z.infer<typeof organizationSchema>) {
  const ctx = await settingsContext("org.settings.manage");
  const org = await getPrisma().organization.update({ where: { id: ctx.organizationId }, data: { name: input.name, timezone: input.timezone } });
  await audit({ organizationId: ctx.organizationId, actorUserId: ctx.user.id, actorEmail: ctx.user.email, action: "organization.update", targetType: "organization", targetId: ctx.organizationId, metadata: input });
  return org;
}

export async function updateMemberRole(targetUserId: string, role: OrgRole) {
  const ctx = await settingsContext("org.members.manage");
  return changeMemberRole(getPrisma(), ctx, targetUserId, role);
}
