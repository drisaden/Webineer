import Link from "next/link";
import { CalendarClock, Search, SlidersHorizontal, Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockWebinars } from "@/data/mock/webinars";

export default function WebinarListPage() {
  return (
    <DashboardShell title="All Webinars">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5">
            <Search className="h-4 w-4 text-secondaryText" />
            <input placeholder="Search webinars..." className="w-full bg-transparent text-sm outline-none" />
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-primaryText">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <Button asChild className="gap-2">
              <Link href="/dashboard/webinars/new">
                <Plus className="h-4 w-4" /> Create Webinar
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mockWebinars.map((webinar) => (
            <div key={webinar.id} className="overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-soft">
              <div className="h-40 bg-gradient-to-br from-[#17294B] via-[#101B35] to-[#16D6B2]/70 p-4 text-white">
                <div className="flex items-center justify-between">
                  <Badge label={webinar.type} tone="info" className="bg-white/10 text-white" />
                  <Badge label={webinar.status} tone={webinar.status === "scheduled" ? "info" : "success"} className="bg-white/10 text-white" />
                </div>
                <div className="mt-12 flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-white/60">Webinar</p>
                    <h3 className="mt-2 text-xl font-semibold">{webinar.title}</h3>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-secondaryText line-clamp-2">{webinar.description}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-secondaryText">
                  <CalendarClock className="h-4 w-4" />
                  {new Date(webinar.schedule.startsAt).toLocaleString()}
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm text-secondaryText">{webinar.registrationCount} registrations</span>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/webinars/${webinar.id}`} className="text-sm font-medium text-[#17294B] hover:underline">
                      Manage
                    </Link>
                    {webinar.slug && (
                      <>
                        <span className="text-border">|</span>
                        <Link href={`/w/${webinar.slug}`} className="text-sm font-medium text-[#16D6B2] hover:underline">
                          Public page
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
