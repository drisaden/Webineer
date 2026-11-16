import { z } from "zod";
import { demoModeResponse, errorResponse, noStore, parseWrite, requireAgent } from "@/server/support/http";
import { agentPresence } from "@/server/support/service";

export const dynamic = "force-dynamic";
const body = z.object({ available: z.boolean().optional() }).strict();

/** Heartbeat while the agent inbox is open. `available` flips the "I'm taking chats" switch. */
export async function POST(request: Request) {
  const demo = demoModeResponse();
  if (demo) return demo;
  try {
    const agent = await requireAgent();
    const parsed = await parseWrite(request, body, { name: "support:presence", max: 30, windowMs: 60_000, subject: agent.id });
    if (!parsed.ok) return parsed.response;
    return noStore(await agentPresence(agent, parsed.data.available));
  } catch (error) {
    return errorResponse(error);
  }
}
