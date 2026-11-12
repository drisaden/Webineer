/**
 * RFC 5545 compliant iCalendar (.ics) generation
 * Generates downloadable calendar invites with no external dependencies.
 */

export interface CalendarEventDetails {
  title: string;
  description: string;
  locationUrl: string;
  startsAt: string; // ISO string
  endsAt?: string; // ISO string
  organizerName?: string;
  organizerEmail?: string;
}

function formatDateToICS(isoString: string): string {
  const date = new Date(isoString);
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function generateICSContent(event: CalendarEventDetails): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const startStr = formatDateToICS(event.startsAt);
  
  // Default end time to 1 hour after start if not provided
  let endStr: string;
  if (event.endsAt) {
    endStr = formatDateToICS(event.endsAt);
  } else {
    const endDate = new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000);
    endStr = formatDateToICS(endDate.toISOString());
  }

  const uid = `webineer-${Date.now()}@webineer.app`;
  const org = event.organizerEmail ? `ORGANIZER;CN=${event.organizerName || "Webineer Host"}:mailto:${event.organizerEmail}` : "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Webineer//Webinar Calendar Invite//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}\\n\\nJoin Room: ${event.locationUrl}`,
    `URL:${event.locationUrl}`,
    org,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Webinar starting in 15 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
