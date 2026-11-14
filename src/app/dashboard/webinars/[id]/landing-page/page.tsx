import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LandingPageBuilder } from "@/components/landing-page/landing-page-builder";
import { getStore } from "@/server/repositories";
import { getCurrentUser } from "@/lib/auth/demo-session";

export default async function WebinarLandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, webinar] = await Promise.all([getCurrentUser(), getStore().getWebinar(id)]);

  // Tenant isolation: another workspace's webinar is indistinguishable from a missing one.
  if (!webinar || !user || webinar.workspaceId !== user.workspaceId) {
    notFound();
  }

  return (
    <DashboardShell title="Landing Page Builder">
      <LandingPageBuilder webinar={webinar} />
    </DashboardShell>
  );
}
