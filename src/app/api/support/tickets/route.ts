import { z } from "zod";
import { CALLBACK_WINDOWS, SUPPORT_CATEGORIES, SUPPORT_LIMITS } from "@/lib/support/types";
import { limitOr429 } from "@/lib/server/http";
import { demoModeResponse, errorResponse, noStore, parseWrite, requireCustomer } from "@/server/support/http";
import { createTicket, listMyTickets } from "@/server/support/service";

export const dynamic = "force-dynamic";

const body = z
  .object({
    channel: z.enum(["CHAT", "EMAIL", "CALLBACK"]),
    subject: z.string().max(SUPPORT_LIMITS.subject).optional(),
    category: z.enum(SUPPORT_CATEGORIES.map((c) => c.id) as [string, ...string[]]).optional(),
    message: z.string().min(1).max(SUPPORT_LIMITS.message),
    phone: z.string().max(SUPPORT_LIMITS.phone).optional(),
    callbackWindow: z.enum(CALLBACK_WINDOWS).optional(),
  })
  .strict();

export async function GET(request: Request) {
  const demo = demoModeResponse();
  if (demo) return demo;
  try {
    const me = await requireCustomer();
    const limited = await limitOr429(request, "support:list", 120, 10 * 60_000, me.id!);
    if (limited) return limited;
    return noStore({ tickets: await listMyTickets(me.id!) });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Start a live chat, email request or callback request as the signed-in user. */
export async function POST(request: Request) {
  const demo = demoModeResponse();
  if (demo) return demo;
  try {
    const me = await requireCustomer();
    const parsed = await parseWrite(request, body, { name: "support:create", max: 20, windowMs: 60 * 60_000, subject: me.id! });
    if (!parsed.ok) return parsed.response;
    const result = await createTicket(me, parsed.data);
    return noStore({ ticket: result.ticket, created: result.created, emailed: result.emailed }, result.created ? 201 : 200);
  } catch (error) {
    return errorResponse(error);
  }
}
