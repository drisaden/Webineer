import { formatDateTime } from "@/lib/datetime";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, Eye, LayoutTemplate, Play, Settings2, Users, Video } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEmbedUrl } from "@/providers/video";
import { getStore } from "@/server/repositories";
import { getCurrentUser, userCan } from "@/lib/auth/demo-session";
import { DeleteWebinarButton } from "@/components/webinars/delete-webinar-button";
import { ShareLinks } from "@/components/webinars/share-links";
import { getAuthMode } from "@/lib/supabase/config";
import { appUrl } from "@/server/email/receipts";
import { shortLinkFor } from "@/server/short-links/service";

export const dynamic = "force-dynamic";

export default async function WebinarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, webinar] = await Promise.all([getCurrentUser(), getStore().getWebinar(id)]);

  // Tenant isolation: another workspace's webinar is indistinguishable from a missing one.
  if (!webinar || !user || webinar.workspaceId !== user.workspaceId) {
    notFound();
  }

  const short = getAuthMode() === "supabase" ? await shortLinkFor(user.workspaceId, webinar.id).catch(() => null) : null;
  const embedUrl = getEmbedUrl(webinar.videoSource.provider, webinar.videoSource.url);

  return (
    <DashboardShell title={webinar.title}>
      <div className="min-w-0 space-y-6">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-border bg-[#101B35] p-6 text-white md:flex-row md:items-center md:justify-between shadow-soft">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wider text-[#16D6B2]">{webinar.type}</span>
              <Badge label={webinar.status} tone={webinar.status === "scheduled" ? "info" : "success"} className="bg-white/10 text-white" />
            </div>
            <h2 className="mt-3 break-words text-2xl font-semibold">{webinar.title}</h2>
            <p className="mt-1 break-words text-sm text-white/70">{webinar.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {userCan(user, "webinar.delete") && <DeleteWebinarButton webinarId={webinar.id} title={webinar.title} />}
            <Button asChild variant="secondary" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              <Link href={`/dashboard/webinars/${webinar.id}/setup`}>
                <Settings2 className="mr-2 h-4 w-4" /> Edit setup
              </Link>
            </Button>
            <Button asChild variant="secondary" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              <Link href={`/dashboard/webinars/${webinar.id}/landing-page`}>
                <LayoutTemplate className="mr-2 h-4 w-4" /> Landing Page
              </Link>
            </Button>
            {webinar.slug && (
              <Button asChild className="bg-[#16D6B2] text-[#101B35] hover:bg-[#0FC7A6]">
                <Link href={webinar.workflow ? `/room/${webinar.slug}?preview=host` : `/room/${webinar.slug}`}>
                  <Play className="mr-2 h-4 w-4" /> Join Room
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="min-w-0 space-y-6">
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
                  {embedUrl ? (
                    <iframe src={embedUrl} title={webinar.title} className="h-full w-full" allowFullScreen />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/70">No video source configured yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-6">
            <div className="rounded-[2rem] border border-border bg-white p-4 shadow-soft sm:p-6">
              <h3 className="text-lg font-semibold text-primaryText">Webinar Details</h3>
              <div className="mt-4 space-y-4 text-sm text-secondaryText">
                <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
                  <span className="flex shrink-0 items-center gap-2"><CalendarClock className="h-4 w-4 text-[#16D6B2]" /> Starts at</span>
                  <span className="min-w-0 break-words text-right font-medium text-primaryText">{formatDateTime(webinar.schedule.startsAt, webinar.schedule.timezone)}</span>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
                  <span className="flex shrink-0 items-center gap-2"><Users className="h-4 w-4 text-[#16D6B2]" /> Registrations</span>
                  <span className="min-w-0 break-words text-right font-medium text-primaryText">{webinar.registrationCount}</span>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
                  <span className="flex shrink-0 items-center gap-2"><Eye className="h-4 w-4 text-[#16D6B2]" /> Attendees</span>
                  <span className="min-w-0 break-words text-right font-medium text-primaryText">{webinar.attendeeCount}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="flex shrink-0 items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16D6B2]" /> Timezone</span>
                  <span className="min-w-0 break-words text-right font-medium text-primaryText">{webinar.schedule.timezone}</span>
                </div>
              </div>

              {webinar.slug && (
                <div className="mt-6 pt-4 border-t border-border">
                  <ShareLinks webinarId={webinar.id} pageUrl={`${appUrl()}/w/${webinar.slug}`} initialShort={short?.url ?? null} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
