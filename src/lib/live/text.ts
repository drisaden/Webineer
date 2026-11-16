/** Text cleaning for live chat and Q&A. Output is rendered as plain text by React. */
export function cleanText(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** "Ada Lovelace" becomes "Ada L." so other attendees never see full names or emails. */
export function publicName(full: string | null | undefined): string {
  const parts = cleanText(full ?? "", 80).split(" ").filter(Boolean);
  if (!parts.length) return "Guest";
  if (parts.length === 1) return parts[0].slice(0, 24);
  return `${parts[0].slice(0, 20)} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function initialsOf(name: string): string {
  const parts = name.replace(/\./g, "").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}
