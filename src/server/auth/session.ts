import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { mockUser, workspace as mockWorkspace } from "@/data/mock/users";
import type { OrgRole } from "@/generated/prisma/client";
import { getAuthMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPrisma, type Db } from "@/server/db/prisma";
import { createOrganizationWithOwner } from "@/server/db/organizations";
import type { User as AppUser, WorkspaceRole } from "@/types";
import { bootstrapSuperAdmin, getPlatformRole, listUserOrganizations, type SessionUser } from "./authorize";

export const ACTIVE_ORG_COOKIE = "webineer_org";

const PLAN_KEYS = ["free", "starter", "professional", "business"] as const;
export type SelectablePlan = (typeof PLAN_KEYS)[number];
export function isPlanKey(value: unknown): value is SelectablePlan {
  return typeof value === "string" && (PLAN_KEYS as readonly string[]).includes(value);
}

/** Verified identity from the Supabase session cookie, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (getAuthMode() !== "supabase") return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email.toLowerCase() : "";
  return { id: data.claims.sub, email };
}

/**
 * Create/update the application profile for a Supabase Auth user and run the
 * one-time super-admin bootstrap. Called after sign-in, email confirmation and
 * whenever a session exists without a profile.
 *
 * Only the display name and preferred workspace name come from user_metadata
 * (which users can edit). Roles never do.
 */
export async function syncUserProfile(db: Db, authUser: SupabaseAuthUser) {
  const email = (authUser.email ?? "").toLowerCase();
  if (!email) throw new Error("Supabase user has no email address.");
  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const name = typeof meta.full_name === "string" ? meta.full_name.slice(0, 120) : typeof meta.name === "string" ? meta.name.slice(0, 120) : "";
  const verifiedAt = authUser.email_confirmed_at ? new Date(authUser.email_confirmed_at) : null;

  const conflict = await db.user.findUnique({ where: { email } });
  if (conflict && conflict.id !== authUser.id) {
    // Same email re-created in Supabase Auth with a new id. Refuse to silently merge accounts.
    throw new Error("An existing profile already uses this email address. Contact support to merge accounts.");
  }

  const profile = await db.user.upsert({
    where: { id: authUser.id },
    create: { id: authUser.id, email, name, emailVerifiedAt: verifiedAt, lastSignInAt: new Date() },
    update: { email, emailVerifiedAt: verifiedAt, lastSignInAt: new Date(), ...(name ? { name } : {}) },
  });

  await bootstrapSuperAdmin(db, { id: authUser.id, email, emailVerified: Boolean(verifiedAt) });
  return {
    profile,
    workspaceName: typeof meta.workspace_name === "string" ? meta.workspace_name.slice(0, 80) : "",
    // Display/onboarding hint only: decides whether the plan chooser is shown. It never grants a plan.
    planPreselected: isPlanKey(meta.selected_plan),
  };
}

/** Every signed-in user needs a workspace; the first one is created automatically. */
export async function ensureDefaultOrganization(db: Db, user: SessionUser & { name: string }, preferredName?: string, planPreselected = false) {
  const existing = await listUserOrganizations(db, user.id);
  if (existing.length > 0) return existing;
  // Only users who don't already belong to an organization get a new one, so invitees aren't duplicated.
  const anyMembership = await db.membership.count({ where: { userId: user.id } });
  if (anyMembership > 0) return existing;
  const name = preferredName?.trim() || (user.name ? `${user.name.split(" ")[0]}'s Workspace` : "My Workspace");
  await createOrganizationWithOwner(db, user, { name, planSelected: planPreselected });
  return listUserOrganizations(db, user.id);
}

export interface AppSession {
  session: SessionUser;
  profile: { id: string; email: string; name: string; title: string | null; avatarUrl: string | null; onboardingCompletedAt: Date | null };
  organization: { id: string; name: string; slug: string; plan: string; planSelectedAt: Date | null };
  role: OrgRole;
  platformRole: Awaited<ReturnType<typeof getPlatformRole>>;
  organizations: { id: string; name: string; slug: string }[];
}

/**
 * Full application session for the current request: verified identity,
 * profile, active organization (cookie, validated against memberships) and role.
 */
export async function getAppSession(): Promise<AppSession | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const db = getPrisma();

  let profile = await db.user.findUnique({ where: { id: session.id } });
  let workspaceName = "";
  let planPreselected = false;
  if (!profile) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const synced = await syncUserProfile(db, data.user);
    profile = synced.profile;
    workspaceName = synced.workspaceName;
    planPreselected = synced.planPreselected;
  }
  if (profile.status !== "ACTIVE") return null;

  const memberships = await ensureDefaultOrganization(db, { id: profile.id, email: profile.email, name: profile.name }, workspaceName, planPreselected);
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const active = memberships.find((m) => m.organizationId === preferred) ?? memberships[0];

  return {
    session,
    profile: { id: profile.id, email: profile.email, name: profile.name, title: profile.title, avatarUrl: profile.avatarUrl, onboardingCompletedAt: profile.onboardingCompletedAt },
    organization: active.organization,
    role: active.role,
    platformRole: await getPlatformRole(db, profile.id),
    organizations: memberships.map((m) => m.organization),
  };
}

/** For pages: redirect to login when there is no valid session. */
export async function requireAppSession(nextPath = "/dashboard"): Promise<AppSession> {
  const app = await getAppSession();
  if (app) return app;
  // Signed in but no usable account (suspended, or no active workspace): don't bounce back to /login,
  // which would redirect a signed-in user to the dashboard again.
  if (await getSessionUser()) redirect("/account-unavailable");
  redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

const ROLE_MAP: Record<OrgRole, WorkspaceRole> = { OWNER: "owner", ADMIN: "admin", EDITOR: "editor", HOST: "host", ANALYST: "analyst" };

/**
 * The existing domain `User` (src/types) for code written against the mock
 * layer. workspaceId is the active organization id.
 */
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const mode = getAuthMode();
  if (mode === "demo") return mockUser;
  if (mode !== "supabase") return null;
  const app = await getAppSession();
  if (!app) return null;
  return {
    id: app.profile.id,
    name: app.profile.name || app.profile.email.split("@")[0],
    email: app.profile.email,
    role: ROLE_MAP[app.role],
    title: app.profile.title ?? "",
    avatarUrl: app.profile.avatarUrl ?? undefined,
    workspaceId: app.organization.id,
  };
}

/** Header/sidebar display data; works in every auth mode. */
export async function getViewerSummary(): Promise<{ name: string; email: string; organizationName: string; mode: string } | null> {
  const mode = getAuthMode();
  if (mode === "demo") return { name: mockUser.name, email: mockUser.email, organizationName: mockWorkspace.name, mode };
  const app = mode === "supabase" ? await getAppSession() : null;
  if (!app) return null;
  return { name: app.profile.name || app.profile.email, email: app.profile.email, organizationName: app.organization.name, mode };
}
