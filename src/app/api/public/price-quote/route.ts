import { checkRateLimit, clientIp } from "@/lib/security/rate-limit";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { KB, readJsonBody } from "@/lib/server/http";
import { RegistrationError, quoteTicket } from "@/services/registration-service";
import { z } from "zod";

const schema = z.object({
  publicId: z.string().min(6).max(40).regex(/^[A-Za-z0-9]+$/),
  tierId: z.string().max(40).optional().default(""),
  discountCode: z.string().max(40).optional().default(""),
});

/** Price for a ticket choice and code. Tightly rate-limited so codes can't be guessed. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const ip = clientIp(request);
  const limit = await checkRateLimit(`quote:ip:${ip}`, 12, 10 * 60_000);
  if (!limit.allowed) {
    return Response.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }
  const read = await readJsonBody(request, 4 * KB);
  if (!read.ok) return read.response;
  const parsed = schema.safeParse(read.data);
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 422 });
  try {
    return Response.json(await quoteTicket(parsed.data.publicId, parsed.data.tierId, parsed.data.discountCode));
  } catch (error) {
    if (error instanceof RegistrationError) return Response.json({ error: error.message, fieldErrors: error.fieldErrors }, { status: error.status });
    console.error("[webineer] price quote failed", error);
    return Response.json({ error: "Could not check the price. Please try again." }, { status: 500 });
  }
}
