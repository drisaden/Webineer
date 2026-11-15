import { isSameOriginRequest, originFromRequest } from "@/lib/server/request-origin";
import { KB, limitOr429, readJsonBody } from "@/lib/server/http";
import { AuthorizationError } from "@/server/auth/authorize";
import { chooseInitialPlan, planChoiceSchema } from "@/server/onboarding";
import { PaymentError } from "@/server/payments/service";

export const dynamic = "force-dynamic";

/** First plan decision for a new workspace. Owners only. A paid choice returns the checkout link. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const limited = await limitOr429(request, "onboarding:plan", 10, 10 * 60_000);
  if (limited) return limited;
  const body = await readJsonBody(request, 2 * KB);
  if (!body.ok) return body.response;
  const parsed = planChoiceSchema.safeParse(body.data);
  if (!parsed.success) return Response.json({ error: "Choose a valid plan." }, { status: 400 });
  try {
    return Response.json(await chooseInitialPlan(parsed.data.plan, originFromRequest(request)));
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof PaymentError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
