/** Support contact details from the environment. Nothing here is a secret. */
export interface SupportContact {
  email: string | null;
  phone: string | null;
  hours: string;
}

const clean = (v: string | undefined) => v?.trim() || "";

function addressOf(value: string): string | null {
  const m = value.match(/<([^>]+)>/);
  const candidate = (m ? m[1] : value).trim();
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(candidate) ? candidate : null;
}

export function supportContact(env: Record<string, string | undefined> = process.env): SupportContact {
  const email = addressOf(clean(env.SUPPORT_EMAIL)) ?? addressOf(clean(env.SMTP_REPLY_TO)) ?? addressOf(clean(env.SMTP_FROM));
  const phoneRaw = clean(env.SUPPORT_PHONE);
  const phone = /^\+?[0-9 ()\-]{7,24}$/.test(phoneRaw) ? phoneRaw : null;
  return { email, phone, hours: clean(env.SUPPORT_HOURS) || "Monday to Friday, 9am to 5pm (WAT)" };
}

/** `tel:` links need digits and an optional leading plus. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
