import { limitOr429 } from "@/lib/server/http";
import { demoModeResponse, errorResponse, noStore, requireAgent } from "@/server/support/http";
import { agentInbox, listAgents, onlineAgentCount, type InboxFilter } from "@/server/support/service";
import { getPrisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";
const FILTERS: InboxFilter[] = ["open", "mine", "unassigned", "pending", "solved"];

/** The agent inbox, polled every few seconds while the page is open. */
export async function GET(request: Request) {
  const demo = demoModeResponse();
  if (demo) return demo;
  try {
    const agent = await requireAgent();
    const limited = await limitOr429(request, "support:inbox", 40, 60_000, agent.id);
    if (limited) return limited;
    const url = new URL(request.url);
    const f = url.searchParams.get("filter") as InboxFilter;
    const filter = FILTERS.includes(f) ? f : "open";
    const [inbox, agents, me, online] = await Promise.all([
      agentInbox(agent, filter, url.searchParams.get("q") ?? ""),
      listAgents(),
      getPrisma().supportAgent.findUnique({ where: { userId: agent.id } }),
      onlineAgentCount(),
    ]);
    return noStore({ ...inbox, agents, me: { id: agent.id, name: agent.name, available: me?.available ?? false }, agentsOnline: online });
  } catch (error) {
    return errorResponse(error);
  }
}
