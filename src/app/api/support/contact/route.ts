import { z } from "zod";
import { SUPPORT_CATEGORIES, SUPPORT_LIMITS } from "@/lib/support/types";
import { limitOr429 } from "@/lib/server/http";
import { checkRateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { demoModeResponse, errorResponse, noStore, parseWrite } from "@/server/support/http";
import { createTicket } from "@/server/support/service";

export const dynamic = "force-dynamic";

const body = z
  .object({
    name: z.string().trim().min(1).max(SUPPORT_LIMITS.name),
    email: z.string().trim().max(254),
    subject: z.string().max(SUPPORT_LIMITS.subject).optional(),
    category: z.enum(SUPPORT_CATEGORIES.map((c) => c.id) as [string, ...string[]]).optional(),
    message: z.string().min(1).max(SUPPORT_LIMITS.message),
    /** Honeypot: real visitors never see or fill this. */
    website: z.string().max(200).optional(),
  })
  .strict();

/** Email form for visitors who aren't signed in (public help center). Creates an email-only ticket. */
export async function POST(request: Request) {
  const demo = demoModeResponse();
  if (demo) return demo;
  const parsed = await parseWrite(request, body, { name: "support:contact", max: 5, windowMs: 60 * 60_000 });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (data.website) return noStore({ ok: true, emailed: true }); // bots get a plausible answer and nothing happens
  const perEmail = await checkRateLimit(`support:contact:email:${data.email.toLowerCase()}`, 3, 24 * 60 * 60_000);
  if (!perEmail.allowed) return tooManyRequests(perEmail, "We already have a few messages from this address today. We'll reply by email soon.");
  try {
    const result = await createTicket({ id: null, name: data.name, email: data.email }, { channel: "EMAIL", subject: data.subject, category: data.category, message: data.message });
    return noStore({ ok: true, number: result.ticket.number, emailed: result.emailed }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
