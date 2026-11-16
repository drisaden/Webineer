import { z } from "zod";
import { SUPPORT_LIMITS } from "@/lib/support/types";
import { limitOr429 } from "@/lib/server/http";
import { demoModeResponse, errorResponse, noStore, parseWrite, requireCustomer } from "@/server/support/http";
import { customerReply, customerSolve, getMyThread } from "@/server/support/service";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f-]{36}$/i;

/** One conversation, polled by the chat while it's open. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return noStore({ error: "Conversation not found." }, 404);
  const demo = demoModeResponse();
  if (demo) return demo;
  try {
    const me = await requireCustomer();
    const limited = await limitOr429(request, "support:thread", 60, 60_000, me.id!);
    if (limited) return limited;
    const after = Math.max(0, Number(new URL(request.url).searchParams.get("after") ?? 0) || 0);
    return noStore(await getMyThread(me.id!, id, after));
  } catch (error) {
    return errorResponse(error);
  }
}

const body = z.union([z.object({ message: z.string().min(1).max(SUPPORT_LIMITS.message) }).strict(), z.object({ solve: z.literal(true) }).strict()]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return noStore({ error: "Conversation not found." }, 404);
  const demo = demoModeResponse();
  if (demo) return demo;
  try {
    const me = await requireCustomer();
    const parsed = await parseWrite(request, body, { name: "support:reply", max: 30, windowMs: 60_000, subject: me.id! });
    if (!parsed.ok) return parsed.response;
    if ("solve" in parsed.data) {
      await customerSolve(me.id!, id);
      return noStore({ ok: true });
    }
    return noStore({ message: await customerReply(me.id!, id, parsed.data.message) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
