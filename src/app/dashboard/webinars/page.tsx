import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WebinarList } from "@/components/webinars/webinar-list";
import { getStore } from "@/server/repositories";
import { getCurrentUser } from "@/lib/auth/demo-session";

// Reads the live repository so newly created drafts and published webinars appear.
export const dynamic = "force-dynamic";

export default async function WebinarListPage() {
  const user = await getCurrentUser();
  // Tenant-scoped: only the active workspace's webinars.
  const webinars = user ? await getStore().listWebinars(user.workspaceId) : [];

  return (
    <DashboardShell title="All Webinars">
      <WebinarList webinars={webinars} canDelete={user?.role === "owner"} />
    </DashboardShell>
  );
}
