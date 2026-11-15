import { notFound } from "next/navigation";
import { AttendeeRoom } from "@/components/room/attendee-room";
import { AccessGate } from "@/components/room/access-gate";
import { ConfiguredRoom } from "@/components/room/configured-room";
import { canManageWebinar, getCurrentUser } from "@/lib/auth/demo-session";
import { decideRoomAccess, recordRoomEntry } from "@/services/attendee-access";
import { getStore } from "@/server/repositories";

export const dynamic = "force-dynamic";

/** Early entry is allowed, but the video itself waits for the scheduled start. */
function hasStarted(sessionStart: Date): boolean {
  return Date.now() >= sessionStart.getTime();
}

export default async function WebinarRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ r?: string; k?: string; preview?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const webinar = await getStore().getWebinarBySlug(slug);

  if (!webinar) {
    notFound();
  }

  if (webinar.workflow) {
    const user = query.preview === "host" ? await getCurrentUser() : null;
    const host = Boolean(user && canManageWebinar(user, webinar));
    if (webinar.status === "draft" && !host) notFound();
    const decision = await decideRoomAccess(webinar, { r: query.r, k: query.k, host });
    if (!decision.allowed) {
      return (
        <AccessGate
          title={webinar.title}
          reason={decision.reason}
          at={decision.at}
          timezone={webinar.workflow.schedules.timezone}
          registerHref={decision.kind === "register" || decision.kind === "payment" ? `/w/${slug}` : undefined}
          replayHref={decision.kind === "ended" && webinar.workflow.replay.enabled ? `/replay/${slug}${query.r ? `?r=${encodeURIComponent(query.r)}&k=${encodeURIComponent(query.k ?? "")}` : ""}` : undefined}
        />
      );
    }
    if (!decision.host) await recordRoomEntry(webinar, decision.registration);
    return (
      <main className="relative z-10 min-h-screen bg-[#F7F9FC] px-4 py-8 text-primaryText md:px-6">
        <div className="mx-auto max-w-7xl">
          {decision.host && (
            <div className="mb-4 rounded-xl border border-[#F5E1BC] bg-[#FFF8EA] px-4 py-2 text-sm text-[#8A5A0E]">
              Host preview — access rules and room timing are bypassed for you.
            </div>
          )}
          <header className="mb-6">
            <p className="text-xs uppercase tracking-[0.16em] text-secondaryText">Attendee room</p>
            <h1 className="mt-1 text-2xl font-semibold text-primaryText">{webinar.title}</h1>
          </header>
          <ConfiguredRoom webinar={webinar} sessionStart={decision.sessionStart} host={decision.host} started={decision.host || hasStarted(decision.sessionStart)} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-8 text-primaryText md:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-secondaryText">Attendee room</p>
            <h1 className="mt-1 text-2xl font-semibold text-primaryText">{webinar.title}</h1>
          </div>
        </header>
        <AttendeeRoom webinar={webinar} />
      </div>
    </main>
  );
}
