import { getCurrentUser } from "@/lib/auth/demo-session";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { publishWebinar, toWorkflowPayload } from "@/services/webinar-workflow-service";
import { handleWorkflowError } from "../../errors";
import { limitOr429 } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await limitOr429(request, "webinar:publish", 60, 60 * 60_000, user.id);
  if (limited) return limited;
  const { id } = await params;
  try {
    const webinar = await publishWebinar(user, id);
    return Response.json(await toWorkflowPayload(webinar));
  } catch (error) {
    return handleWorkflowError(error);
  }
}
