import { originFromRequest } from "@/lib/server/request-origin";
import { generateICSContent } from "@/providers/calendar/ics";
import { getPublishedWebinarByPublicId, verifyAccess } from "@/services/registration-service";
import { personalLinks, sessionStartFor } from "@/services/workflow-notifications";
import { limitOr429 } from "@/lib/server/http";

/** Add-to-calendar (.ics) using the existing ICS generator. */
export async function GET(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const limited = await limitOr429(request, "calendar", 60, 10 * 60_000);
  if (limited) return limited;
  if (!/^[A-Za-z0-9]{6,40}$/.test(publicId)) return new Response("Not found", { status: 404 });
  const webinar = await getPublishedWebinarByPublicId(publicId);
  if (!webinar?.workflow) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const registration = await verifyAccess(webinar, url.searchParams.get("r"), url.searchParams.get("k"));
  const origin = originFromRequest(request);
  const start = sessionStartFor(webinar, registration ?? undefined);
  const end = new Date(start.getTime() + webinar.workflow.schedules.durationMinutes * 60_000);
  const locationUrl = registration ? personalLinks(webinar, registration, origin).joinLink : `${origin}/w/${webinar.slug ?? webinar.id}`;
  const ics = generateICSContent({
    title: webinar.title,
    description: webinar.description,
    locationUrl,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    organizerName: webinar.workflow.configuration.hostName,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${(webinar.slug ?? "webinar").slice(0, 60)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
