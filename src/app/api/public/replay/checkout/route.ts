import { KB, limitOr429, readJsonBody } from "@/lib/server/http";
import { isSameOriginRequest, originFromRequest } from "@/lib/server/request-origin";
import { RegistrationError, startReplayPurchase } from "@/services/registration-service";
import { z } from "zod";

const schema = z.object({
  slug: z.string().min(1).max(120),
  r: z.string().max(60).optional(),
  k: z.string().max(120).optional(),
  name: z.string().max(120).optional(),
  email: z.string().max(200).optional(),
});

/** Start buying a replay. Returns the payment link, or says the buyer already has access. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const limited = await limitOr429(request, "replay:checkout", 10, 10 * 60_000);
  if (limited) return limited;
  const read = await readJsonBody(request, 4 * KB);
  if (!read.ok) return read.response;
  const parsed = schema.safeParse(read.data);
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 422 });
  try {
    return Response.json(await startReplayPurchase(parsed.data, originFromRequest(request)));
  } catch (error) {
    if (error instanceof RegistrationError) return Response.json({ error: error.message, fieldErrors: error.fieldErrors }, { status: error.status });
    console.error("[webineer] replay checkout failed", error);
    return Response.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
  }
}
