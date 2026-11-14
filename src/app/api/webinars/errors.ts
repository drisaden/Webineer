import { WorkflowError } from "@/services/webinar-workflow-service";

export function handleWorkflowError(error: unknown) {
  if (error instanceof WorkflowError) {
    return Response.json({ error: error.message, details: error.details }, { status: error.status });
  }
  console.error("[webineer] workflow error", error);
  return Response.json({ error: "Something went wrong while saving. Please try again." }, { status: 500 });
}
