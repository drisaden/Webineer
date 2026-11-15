import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBuilder } from "@/components/page-design/page-builder";
import { getCurrentUser } from "@/lib/auth/demo-session";
import { publicViewFor } from "@/services/registration-service";
import { ensureWorkflow, getOwnedWebinar, WorkflowError } from "@/services/webinar-workflow-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Landing page designer · Webineer" };

/** Full-screen drag-and-drop designer for a webinar's registration page. */
export default async function WebinarLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let webinar;
  try {
    // Tenant isolation: another workspace's webinar is indistinguishable from a missing one.
    webinar = await ensureWorkflow(user, await getOwnedWebinar(user, id, "webinar.edit"));
  } catch (error) {
    if (error instanceof WorkflowError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
  const config = webinar.workflow!;

  return (
    <PageBuilder
      key={webinar.id}
      webinarId={webinar.id}
      slug={webinar.slug ?? null}
      title={webinar.title || "Untitled webinar"}
      isDraft={webinar.status === "draft"}
      registration={config.registration}
      baseVersion={config.version}
      view={await publicViewFor(webinar)}
    />
  );
}
