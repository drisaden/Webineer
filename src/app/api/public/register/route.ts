import { checkRateLimit, clientIp } from "@/lib/security/rate-limit";
import { isSameOriginRequest, originFromRequest } from "@/lib/server/request-origin";
import { publicRegistrationSchema } from "@/lib/webinar-workflow/schemas";
import { RegistrationError, registerAttendee } from "@/services/registration-service";
import { KB, readJsonBody } from "@/lib/server/http";

/**
 * Public registration endpoint shared by the hosted page, inline embed, popup
 * embed and registration button. Never trusts client values beyond the
 * validated input; the webinar is resolved server-side from its public id.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const ip = clientIp(request);
  const burst = await checkRateLimit(`reg:ip:${ip}`, 20, 10 * 60_000);
  if (!burst.allowed) {
    return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(burst.retryAfterSeconds) } });
  }

  const read = await readJsonBody(request, 16 * KB);
  if (!read.ok) return read.response;
  const body: unknown = read.data;
  const parsed = publicRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return Response.json({ error: "Please fix the highlighted fields.", fieldErrors }, { status: 422 });
  }

  const perWebinar = await checkRateLimit(`reg:${parsed.data.publicId}:${ip}`, 8, 10 * 60_000);
  if (!perWebinar.allowed) {
    return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(perWebinar.retryAfterSeconds) } });
  }

  try {
    const outcome = await registerAttendee(parsed.data, { origin: originFromRequest(request) });
    return Response.json(outcome, { status: outcome.kind === "registered" ? 201 : 200 });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return Response.json({ error: error.message, fieldErrors: error.fieldErrors }, { status: error.status });
    }
    console.error("[webineer] registration failed", error);
    return Response.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
