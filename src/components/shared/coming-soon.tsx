import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <DashboardShell title={title}>
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="max-w-xl rounded-[2rem] border border-border bg-white p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EAFBF5] text-xl font-semibold text-[#0F7B52]">Soon</div>
          <h2 className="text-2xl font-semibold text-primaryText">{title}</h2>
          <p className="mt-3 text-base text-secondaryText">{description}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="primary">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard/webinars">Browse webinars</Link>
            </Button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
