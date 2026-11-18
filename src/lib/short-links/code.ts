import { randomInt } from "node:crypto";

/** Lower-case letters and digits without look-alikes (no 0/o, 1/l/i), so a code is easy to read out or type. */
export const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const CODE_LENGTH = 7;

export function generateCode(length = CODE_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** Cheap shape check before touching the database. */
export function isValidCode(code: string): boolean {
  return /^[a-z0-9]{4,16}$/.test(code);
}

function clean(url: string | undefined): string | null {
  const v = url?.trim().replace(/\/+$/, "");
  return v && /^https?:\/\/[^\s/]+/.test(v) ? v : null;
}

/**
 * The link people share. SHORT_LINK_BASE_URL can be a shorter domain pointed at this app, for example https://w.ta,
 * and falls back to the app's own address.
 */
export function shortUrl(code: string, env: Record<string, string | undefined> = process.env): string {
  const base = clean(env.SHORT_LINK_BASE_URL) ?? clean(env.NEXT_PUBLIC_APP_URL) ?? "http://localhost:3000";
  return `${base}/s/${code}`;
}
