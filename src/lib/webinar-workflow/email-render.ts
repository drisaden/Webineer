/**
 * Placeholder substitution and safe rendering for workflow emails.
 * Bodies are plain text with **bold** and line breaks; everything else is
 * HTML-escaped so user content can never inject markup.
 */

export type EmailVariables = Record<string, string>;

export function applyPlaceholders(template: string, variables: EmailVariables): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => (key in variables ? variables[key] : match));
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailHtml(body: string, variables: EmailVariables): string {
  const text = escapeHtml(applyPlaceholders(body, variables));
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
    .replace(/\n/g, "<br />");
}

export const SAMPLE_EMAIL_VARIABLES: EmailVariables = {
  first_name: "Jordan",
  webinar_date: "Wed, 18th Nov., 2026",
  webinar_time: "6:00pm",
  webinar_timezone: "Africa/Lagos",
  join_link: "https://your-domain/room/your-webinar?r=…",
  replay_link: "https://your-domain/replay/your-webinar?r=…",
};
