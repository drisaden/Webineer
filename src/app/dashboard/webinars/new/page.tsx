import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WebinarWorkflow } from "@/components/webinars/workflow/webinar-workflow";
import { getCurrentUser } from "@/lib/auth/demo-session";
import { createDefaultWorkflowConfig, WORKFLOW_SECTIONS } from "@/lib/webinar-workflow/defaults";
import { resolveAppOrigin } from "@/lib/webinar-workflow/embed";
import { getPaymentAvailability, organizationTimezone } from "@/services/webinar-workflow-service";
import type { WorkflowSectionKey } from "@/types";

export const dynamic = "force-dynamic";

export default async function NewWebinarPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { section } = await searchParams;
  const initialSection = (WORKFLOW_SECTIONS.some((s) => s.key === section) ? section : "configuration") as WorkflowSectionKey;
  // Nothing is stored until the first save, so visiting this page never creates empty drafts.
  const initialConfig = createDefaultWorkflowConfig({ hostName: user.name, hostEmail: user.email, timezone: await organizationTimezone(user.workspaceId) });

  return (
    <DashboardShell title="Create Webinar">
      <WebinarWorkflow
        initialPayload={null}
        initialConfig={initialConfig}
        initialSection={initialSection}
        appOrigin={resolveAppOrigin()}
        payment={getPaymentAvailability()}
      />
    </DashboardShell>
  );
}
