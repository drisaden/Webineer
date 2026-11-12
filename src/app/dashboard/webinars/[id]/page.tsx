import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, Eye, LayoutTemplate, Play, Users, Video } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEmbedUrl } from "@/providers/video";
import { mockWebinarRepository } from "@/services/mock-webinar-repository";

export default async function WebinarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const webinar = mockWebinarRepository.getById(id);

  if (!webinar) {
    notFound();
  }

  const embedUrl = getEmbedUrl(webinar.videoSource.provider, webinar.videoSource.url);

  return (
    <DashboardShell title={webinar.title}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-border bg-[#101B35] p-6 text-white md:flex-row md:items-center md:justify-between shadow-soft">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wider text-[#16D6B2]">{webinar.type}</span>
              <Badge label={webinar.status} tone={webinar.status === "scheduled" ? "info" : "success"} className="bg-white/10 text-white" />
            </div>
            <h2 className="mt-3 text-2xl font-semibold">{webinar.title}</h2>
            <p className="mt-1 text-sm text-white/70">{webinar.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              <Link href={`/dashboard/webinars/${webinar.id}/landing-page`}>
                <LayoutTemplate className="mr-2 h-4 w-4" /> Landing Page
              </Link>
            </Button>
            {webinar.slug && (
              <Button asChild className="bg-[#16D6B2] text-[#101B35] hover:bg-[#0FC7A6]">
                <Link href={`/room/${webinar.slug}`}>
                  <Play className="mr-2 h-4 w-4" /> Join Room
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[2rem] border border-border bg-white p-4 shadow-soft">
              <div className="mb-4 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-[#16D6B2]" />
                  <span className="text-sm font-medium text-primaryText">Video source: {webinar.videoSource.provider}</span>
                </div>
                <span className="text-xs text-secondaryText">Native embed preview</span>
              </div>
              <div className="overflow-hidden rounded-[1.5rem] border border-border bg-[#101B35]">
                <div className="aspect-video w-full bg-[#111C2E]">
                  <iframe src={embedUrl} title={webinar.title} className="h-full w-full" allowFullScreen />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
              <h3 className="text-lg font-semibold text-primaryText">Webinar Details</h3>
              <div className="mt-4 space-y-4 text-sm text-secondaryText">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#16D6B2]" /> Starts at</span>
                  <span className="font-medium text-primaryText">{new Date(webinar.schedule.startsAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[#16D6B2]" /> Registrations</span>
                  <span className="font-medium text-primaryText">{webinar.registrationCount}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="flex items-center gap-2"><Eye className="h-4 w-4 text-[#16D6B2]" /> Attendees</span>
                  <span className="font-medium text-primaryText">{webinar.attendeeCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16D6B2]" /> Timezone</span>
                  <span className="font-medium text-primaryText">{webinar.schedule.timezone}</span>
                </div>
              </div>

              {webinar.slug && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-secondaryText mb-2">Public Registration URL</p>
                  <Link href={`/w/${webinar.slug}`} className="block truncate text-sm font-medium text-[#16D6B2] hover:underline">
                    /w/{webinar.slug}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
