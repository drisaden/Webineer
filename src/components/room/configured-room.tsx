import { UserRound } from "lucide-react";
import { buildPlayerUrl } from "@/lib/webinar-workflow/video";
import { getVideoProvider } from "@/providers/video";
import type { Webinar } from "@/types";
import { formatInZone } from "@/lib/webinar-workflow/time";
import { RoomCta } from "./room-cta";
import { hostLiveChoices } from "@/lib/live/features";
import { AnnouncementBanner, LiveRoom, LiveStatusBar, ReactionOverlay } from "./live/live-room";
import { LivePanel } from "./live/live-panel";
import { RoomStage } from "./room-stage";

/** Attendee room rendered from the workflow's Live settings. */
export interface RoomViewer {
  slug: string;
  registrationId?: string;
  accessKey?: string;
  /** Anyone-with-the-link visitors have no registration, so they choose a display name. */
  anonymous: boolean;
}

export function ConfiguredRoom({ webinar, sessionStart, host, started, viewer }: { webinar: Webinar; sessionStart: Date; host: boolean; started: boolean; viewer: RoomViewer }) {
  const config = webinar.workflow!;
  const video = config.integrations.video;
  const provider = getVideoProvider(video.provider);
  const playerUrl = provider.supportsEmbed ? buildPlayerUrl(video.provider, video.url, video) : null;
  const live = config.live;
  const presenters = config.configuration.presenters.filter((p) => p.name.trim());
  const sandboxed = video.provider === "custom_iframe" || video.provider === "external_live_stream";
  const interactive = Object.values(hostLiveChoices(live)).some(Boolean);
  const about =
    live.showDescription && webinar.description ? (
      <div className="rounded-[2rem] border border-border bg-white p-5 shadow-soft">
        <h3 className="text-base text-primaryText">About this webinar</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-secondaryText">{webinar.description}</p>
      </div>
    ) : null;

  const body = (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
      <div className="min-w-0 space-y-5">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-white p-3 shadow-soft">
          {interactive && <AnnouncementBanner />}
          <RoomStage
            title={webinar.title}
            startsAt={sessionStart.toISOString()}
            startedOnServer={started}
            alwaysOpen={host}
            startLabel={formatInZone(sessionStart, config.schedules.timezone)}
            liveLabel={config.configuration.mode === "always_on" ? "On demand" : "Live"}
            overlay={interactive ? <ReactionOverlay /> : undefined}
          >
              {playerUrl ? (
                <iframe
                  src={playerUrl}
                  title={webinar.title}
                  className="h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox={sandboxed ? "allow-scripts allow-same-origin allow-presentation allow-popups" : undefined}
                />
              ) : video.url && /^https:\/\//.test(video.url) ? (
                <div className="flex h-full items-center justify-center p-6 text-center">
                  <a href={video.url} target="_blank" rel="noopener" className="rounded-2xl bg-[#16D6B2] px-5 py-3 font-semibold text-[#101B35]">
                    Open the webinar stream
                  </a>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/70">The host hasn’t added a video yet.</div>
              )}
          </RoomStage>
          {interactive && <LiveStatusBar liveLabel={config.configuration.mode === "always_on" ? "On demand" : "Live"} />}
        </div>
        {about && <div className="hidden xl:block">{about}</div>}
      </div>
      <aside className="space-y-5">
        {interactive && <LivePanel slug={viewer.slug} />}
        {live.cta.enabled && live.cta.label && /^https:\/\//.test(live.cta.url) && (
          <RoomCta label={live.cta.label} url={live.cta.url} showAt={host ? new Date(0).toISOString() : new Date(sessionStart.getTime() + live.cta.showAfterMinutes * 60_000).toISOString()} />
        )}
        {live.showPresenters && (
          <div className="rounded-[2rem] border border-border bg-white p-5 shadow-soft">
            <h3 className="text-sm font-medium text-primaryText">{presenters.length > 1 ? "Presenters" : "Your host"}</h3>
            <ul className="mt-4 space-y-3">
              {(presenters.length ? presenters : [{ id: "host", name: config.configuration.hostName, title: "Host", avatarUrl: "", bio: "" }]).map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  {p.avatarUrl && /^https:\/\//.test(p.avatarUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF5FF] text-[#17294B]">
                      <UserRound className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primaryText">{p.name}</p>
                    {p.title && <p className="truncate text-xs text-secondaryText">{p.title}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {about && <div className="xl:hidden">{about}</div>}
      </aside>
    </div>
  );

  if (!interactive) return body;
  return (
    <LiveRoom options={{ slug: viewer.slug, registrationId: viewer.registrationId, accessKey: viewer.accessKey, asHost: host, anonymous: viewer.anonymous }}>
      {body}
    </LiveRoom>
  );
}
