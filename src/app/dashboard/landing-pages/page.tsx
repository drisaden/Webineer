import Link from "next/link";
import { ArrowRight, CheckCircle2, LayoutTemplate, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { mockWebinars } from "@/data/mock/webinars";

export default function LandingPagesPage() {
  return (
    <DashboardShell title="Landing Pages">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-border bg-white p-4 shadow-soft">
          <div>
            <p className="text-sm text-secondaryText">Registration experience builder</p>
            <h2 className="mt-1 text-xl font-semibold text-primaryText">Brand your webinar pages before launch</h2>
          </div>
          <Button asChild>
            <Link href="/dashboard/webinars/new">Create new webinar</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mockWebinars.map((webinar) => (
            <div key={webinar.id} className="rounded-[1.5rem] border border-border bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#EAFBF5] px-2.5 py-1 text-xs font-medium text-[#0F7B52]">
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  {webinar.type}
                </div>
                <span className="text-xs uppercase tracking-[0.12em] text-secondaryText">{webinar.status}</span>
              </div>

              <h3 className="mt-4 text-xl font-semibold text-primaryText">{webinar.title}</h3>
              <p className="mt-2 text-sm text-secondaryText">{webinar.description}</p>

              <div className="mt-4 rounded-2xl border border-border bg-[#F7F9FC] p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-primaryText">
                  <CheckCircle2 className="h-4 w-4 text-[#16A36A]" />
                  Ready to publish
                </div>
                <p className="mt-2 text-xs text-secondaryText">Hero, features, CTA, and form blocks are staged for the live event.</p>
              </div>

              <Link href={`/dashboard/webinars/${webinar.id}/landing-page`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#17294B]">
                Edit page <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-dashed border-border bg-[#F7F9FC] p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAFBF5] text-[#0F7B52]">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-primaryText">Template library coming soon</h3>
          <p className="mt-2 text-sm text-secondaryText">The page builder already supports hero sections, video blocks, CTA sections, and form layouts for live registration pages.</p>
        </div>
      </div>
    </DashboardShell>
  );
}
