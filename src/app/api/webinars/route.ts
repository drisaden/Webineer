import { getCurrentUser } from "@/lib/auth/demo-session";
import { sectionPatchSchema } from "@/lib/webinar-workflow/schemas";
import { createDraft, toWorkflowPayload, updateSections } from "@/services/webinar-workflow-service";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { handleWorkflowError } from "./errors";
import { KB, limitOr429, readJsonBody } from "@/lib/server/http";

/** Create a webinar draft, optionally with initial section data. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to create webinars." }, { status: 401 });

  const limited = await limitOr429(request, "webinar:create", 60, 60 * 60_000, user.id);
  if (limited) return limited;
  const body = await readJsonBody(request, 512 * KB, {});
  if (!body.ok) return body.response;
  const parsed = sectionPatchSchema.partial({ baseVersion: true }).safeParse(body.data ?? {});
  if (!parsed.success) {
    return Response.json({ error: "Some settings are invalid.", issues: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const draft = await createDraft(user);
    const sections = parsed.data.sections ?? {};
    const webinar = Object.keys(sections).length ? await updateSections(user, draft.id, sections, draft.workflow!.version) : draft;
    return Response.json(await toWorkflowPayload(webinar), { status: 201 });
  } catch (error) {
    return handleWorkflowError(error);
  }
}
