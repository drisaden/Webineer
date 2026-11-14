import { mockUser, workspace as mockWorkspace } from "@/data/mock/users";
import type { Viewer } from "@/components/auth/viewer-context";
import { getAuthMode } from "@/lib/supabase/config";
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
