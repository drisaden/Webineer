import { z } from "zod";
import { SUPPORT_LIMITS } from "@/lib/support/types";
import { limitOr429 } from "@/lib/server/http";
import { demoModeResponse, errorResponse, noStore, parseWrite, requireAgent } from "@/server/support/http";
import { agentAssign, agentReply, agentSetStatus, agentThread } from "@/server/support/service";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return noStore({ error: "Conversation not found." }, 404);
  const demo = demoModeResponse();
  if (demo) return demo;
  try {
    const agent = await requireAgent();
    const limited = await limitOr429(request, "support:agent-thread", 90, 60_000, agent.id);
    if (limited) return limited;
    const after = Math.max(0, Number(new URL(request.url).searchParams.get("after") ?? 0) || 0);
    return noStore(await agentThread(id, after));
  } catch (error) {
    return errorResponse(error);
  }
}

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reply"), message: z.string().min(1).max(SUPPORT_LIMITS.message) }).strict(),
  z.object({ action: z.literal("note"), message: z.string().min(1).max(SUPPORT_LIMITS.message) }).strict(),
  z.object({ action: z.literal("status"), status: z.enum(["OPEN", "PENDING", "SOLVED"]) }).strict(),
  z.object({ action: z.literal("assign"), assigneeId: z.string().regex(uuid).nullable() }).strict(),
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return noStore({ error: "Conversation not found." }, 404);
  const demo = demoModeResponse();
  if (demo) return demo;
  try {
    const agent = await requireAgent();
    const parsed = await parseWrite(request, body, { name: "support:agent-act", max: 60, windowMs: 60_000, subject: agent.id });
    if (!parsed.ok) return parsed.response;
    const d = parsed.data;
    if (d.action === "reply" || d.action === "note") return noStore({ message: await agentReply(agent, id, d.message, { internal: d.action === "note" }) }, 201);
    if (d.action === "status") await agentSetStatus(agent, id, d.status);
    else await agentAssign(agent, id, d.assigneeId);
    return noStore({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
