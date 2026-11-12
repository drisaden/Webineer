import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LandingPageBuilder } from "@/components/landing-page/landing-page-builder";
import { mockWebinarRepository } from "@/services/mock-webinar-repository";

export default async function WebinarLandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const webinar = mockWebinarRepository.getById(id);

  if (!webinar) {
    notFound();
  }

  return (
    <DashboardShell title="Landing Page Builder">
      <LandingPageBuilder webinar={webinar} />
    </DashboardShell>
  );
}
