import type { PlanKey } from "@/server/payments/service";
import { getEffectivePlan } from "@/server/payments/service";
import { getStore } from "@/server/repositories";

/** The plan that decides which live-room features a workspace's hosts see in settings. */
export async function livePlanFor(workspaceId: string): Promise<PlanKey> {
  if (getStore().kind === "mock") return "professional";
  try {
    return (await getEffectivePlan(workspaceId)).plan;
  } catch {
    return "free";
  }
}
