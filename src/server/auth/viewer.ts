import { mockUser, workspace as mockWorkspace } from "@/data/mock/users";
import type { Viewer } from "@/components/auth/viewer-context";
import { getAuthMode } from "@/lib/supabase/config";
import { cloudinaryConfigured } from "@/server/uploads/cloudinary";
import { ORG_ROLE_PERMISSIONS } from "./permissions";
import { getAppSession, type AppSession } from "./session";

export function viewerFromSession(app: AppSession): Viewer {
  return {
    name: app.profile.name || app.profile.email.split("@")[0],
    email: app.profile.email,
    organizationId: app.organization.id,
    organizationName: app.organization.name,
    organizations: app.organizations.map((o) => ({ id: o.id, name: o.name })),
    mode: "supabase",
    isPlatformAdmin: Boolean(app.platformRole),
    uploadsEnabled: cloudinaryConfigured(),
    onboarding: {
      // Only someone who can manage billing is asked to choose; teammates go straight in.
      needsPlanChoice: !app.organization.planSelectedAt && app.organization.plan === "FREE" && ORG_ROLE_PERMISSIONS[app.role].includes("org.billing.manage"),
      showTour: !app.profile.onboardingCompletedAt,
    },
  };
}

export async function getViewer(): Promise<Viewer | null> {
  const mode = getAuthMode();
  if (mode === "demo") {
    return { name: mockUser.name, email: mockUser.email, organizationId: mockWorkspace.id, organizationName: mockWorkspace.name, organizations: [{ id: mockWorkspace.id, name: mockWorkspace.name }], mode: "demo", isPlatformAdmin: true };
  }
  if (mode !== "supabase") return null;
  const app = await getAppSession();
  return app ? viewerFromSession(app) : null;
}
