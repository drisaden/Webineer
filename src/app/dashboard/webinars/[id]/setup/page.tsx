import { notFound, redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WebinarWorkflow } from "@/components/webinars/workflow/webinar-workflow";
import { getCurrentUser } from "@/lib/auth/demo-session";
import { WORKFLOW_SECTIONS } from "@/lib/webinar-workflow/defaults";
import { resolveAppOrigin } from "@/lib/webinar-workflow/embed";
import { ensureWorkflow, getOwnedWebinar, getPaymentAvailability, toWorkflowPayload, WorkflowError } from "@/services/webinar-workflow-service";
import type { WorkflowSectionKey } from "@/types";

export const dynamic = "force-dynamic";

export default async function WebinarSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const { section } = await searchParams;

  let payload;
  try {
    payload = await toWorkflowPayload(await ensureWorkflow(user, await getOwnedWebinar(user, id, "webinar.view")));
  } catch (error) {
    if (error instanceof WorkflowError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
  const initialSection = (WORKFLOW_SECTIONS.some((s) => s.key === section) ? section : "configuration") as WorkflowSectionKey;

  return (
    <DashboardShell title={payload.webinar.status === "draft" ? "Webinar Setup" : "Edit Webinar"}>
      <WebinarWorkflow
        key={payload.webinar.id}
        initialPayload={payload}
        initialConfig={payload.config}
        initialSection={initialSection}
        appOrigin={resolveAppOrigin()}
        payment={getPaymentAvailability()}
      />
    </DashboardShell>
  );
}
