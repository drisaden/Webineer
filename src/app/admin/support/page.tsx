import { notFound } from "next/navigation";
import { AgentInbox } from "@/components/support/agent-inbox";
import { getSessionUser } from "@/server/auth/session";
import { AuthorizationError, requirePlatformPermission } from "@/server/auth/authorize";
import { getPrisma } from "@/server/db/prisma";
import { getStore } from "@/server/repositories";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  if (getStore().kind === "mock") {
    return <div className="rounded-[1.5rem] border border-dashed border-border bg-[#F7F9FC] p-6 text-sm text-secondaryText">The support desk needs the database. It isn&apos;t available in demo mode.</div>;
  }
  const user = await getSessionUser();
  if (!user) notFound();
  try {
    await requirePlatformPermission(getPrisma(), user, "admin.support.manage");
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  const { ticket } = await searchParams;
  return <AgentInbox initialTicket={ticket && /^[0-9a-f-]{36}$/i.test(ticket) ? ticket : undefined} />;
}
