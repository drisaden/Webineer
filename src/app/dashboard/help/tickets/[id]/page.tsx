import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TicketThread } from "@/components/support/ticket-thread";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <DashboardShell title="Help & Support">
      <div className="space-y-4">
        <Link href="/dashboard/help" className="tap text-sm font-medium text-[#17294B]">← All support options</Link>
        <div className="flex h-[calc(100dvh-16rem)] min-h-[28rem] flex-col overflow-hidden rounded-[2rem] border border-border bg-white shadow-soft">
          {/^[0-9a-f-]{36}$/i.test(id) ? <TicketThread base={`/api/support/tickets/${id}`} role="customer" className="flex-1" /> : <p className="p-6 text-sm text-secondaryText">This conversation isn&apos;t available.</p>}
        </div>
      </div>
    </DashboardShell>
  );
}
