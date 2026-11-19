import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReplayPurchase } from "@/components/room/replay-purchase";
import { AccessGate } from "@/components/room/access-gate";
import { canManageWebinar, getCurrentUser } from "@/lib/auth/demo-session";
import { buildPlayerUrl } from "@/lib/webinar-workflow/video";
import { getVideoProvider } from "@/providers/video";
import { decideReplayAccess } from "@/services/attendee-access";
import { getStore } from "@/server/repositories";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function ReplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ r?: string; k?: string; preview?: string; payment?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const webinar = await getStore().getWebinarBySlug(slug);
  if (!webinar?.workflow) notFound();

  const user = query.preview === "host" ? await getCurrentUser() : null;
  const host = Boolean(user && canManageWebinar(user, webinar));
  if (webinar.status === "draft" && !host) notFound();

  const config = webinar.workflow;
  const decision = await decideReplayAccess(webinar, { r: query.r, k: query.k, host });
  if (!decision.allowed && decision.kind === "purchase") {
    const note = query.payment === "pending" ? "Your payment is still being confirmed. Refresh in a minute; if you were charged you will get access automatically." : query.payment === "failed" ? "The payment didn't go through. You haven't been charged. Please try again." : undefined;
    return <ReplayPurchase slug={slug} title={config.replay.title || `${webinar.title} — replay`} price={decision.price} currency={decision.currency} r={query.r} k={query.k} note={note} />;
  }
  if (!decision.allowed) {
    return (
      <AccessGate
        title={`${webinar.title} — replay`}
        reason={decision.reason}
        at={decision.at}
        timezone={config.schedules.timezone}
        registerHref={decision.kind === "register" ? `/w/${slug}` : undefined}
      />
    );
  }

  const source = config.replay.useLiveVideo ? config.integrations.video : config.replay.video;
  const playerUrl = getVideoProvider(source.provider).supportsEmbed ? buildPlayerUrl(source.provider, source.url) : null;
  if (!decision.host) {
    await getStore().recordEvent({ workspaceId: webinar.workspaceId, webinarId: webinar.id, eventType: "replay_viewed", source: decision.registration?.source, registrationId: decision.registration?.id });
  }

  return (
    <main className="relative z-10 min-h-screen bg-[#F7F9FC] px-4 py-8 text-primaryText md:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {decision.host && <div className="rounded-xl border border-[#F5E1BC] bg-[#FFF8EA] px-4 py-2 text-sm text-[#8A5A0E]">Host preview — access rules are bypassed for you.</div>}
        <header>
          <p className="text-xs uppercase tracking-[0.16em] text-secondaryText">Replay</p>
          <h1 className="mt-1 text-2xl font-semibold text-primaryText">{config.replay.title || `${webinar.title} — replay`}</h1>
        </header>
        <div className="overflow-hidden rounded-[2rem] border border-border bg-white p-3 shadow-soft">
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-[#101B35]">
            <div className="aspect-video w-full bg-[#111C2E]">
              {playerUrl ? (
                <iframe src={playerUrl} title={`${webinar.title} replay`} className="h-full w-full" allow="fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              ) : source.url && /^https:\/\//.test(source.url) ? (
                <div className="flex h-full items-center justify-center">
                  <a href={source.url} target="_blank" rel="noopener" className="rounded-2xl bg-[#16D6B2] px-5 py-3 font-semibold text-[#101B35]">
                    Open the recording
                  </a>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/70">The recording isn’t available yet.</div>
              )}
            </div>
          </div>
        </div>
        {(config.replay.description || webinar.description) && (
          <div className="rounded-[2rem] border border-border bg-white p-5 shadow-soft">
            <p className="whitespace-pre-line text-sm text-secondaryText">{config.replay.description || webinar.description}</p>
          </div>
        )}
      </div>
    </main>
  );
}
