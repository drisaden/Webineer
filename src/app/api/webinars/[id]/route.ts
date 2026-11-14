import { getCurrentUser } from "@/lib/auth/demo-session";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { sectionPatchSchema } from "@/lib/webinar-workflow/schemas";
import { deleteWebinar, ensureWorkflow, getOwnedWebinar, toWorkflowPayload, updateSections } from "@/services/webinar-workflow-service";
import { handleWorkflowError } from "../errors";
import { KB, limitOr429, readJsonBody } from "@/lib/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    return Response.json(await toWorkflowPayload(await ensureWorkflow(user, await getOwnedWebinar(user, id, "webinar.view"))));
  } catch (error) {
    return handleWorkflowError(error);
  }
}

/** Section-scoped update: only sections present in the body are changed. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Autosave-friendly ceiling per user.
  const limited = await limitOr429(request, "webinar:update", 600, 60 * 60_000, user.id);
  if (limited) return limited;
  const body = await readJsonBody(request, 512 * KB);
  if (!body.ok) return body.response;
  const parsed = sectionPatchSchema.safeParse(body.data);
  if (!parsed.success) {
    return Response.json({ error: "Some settings are invalid.", issues: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const webinar = await updateSections(user, id, parsed.data.sections, parsed.data.baseVersion);
    return Response.json(await toWorkflowPayload(webinar));
  } catch (error) {
    return handleWorkflowError(error);
  }
}

/** Soft delete (requires webinar.delete). Registrations and payments are retained. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await limitOr429(request, "webinar:delete", 30, 60 * 60_000, user.id);
  if (limited) return limited;
  const { id } = await params;
  try {
    await deleteWebinar(user, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleWorkflowError(error);
  }
}
