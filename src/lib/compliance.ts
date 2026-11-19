import { createHmac, timingSafeEqual } from "node:crypto";
import { APP_NAME } from "@/lib/constants/site";

/**
 * Business details shown in legal pages and the footer of commercial email.
 * They come from environment variables so real values are never hard-coded, and nothing is
 * invented when they are missing: the pages and emails simply omit what isn't configured.
 */
export interface CompanyInfo {
  name: string;
  /** Postal address printed in the footer of marketing email (required by CAN-SPAM). */
  postalAddress: string;
  contactEmail: string;
}

const clean = (value: string | undefined) => (value ?? "").replace(/[\r\n]+/g, " ").trim();

export function companyInfo(): CompanyInfo {
  return {
    name: clean(process.env.COMPANY_LEGAL_NAME) || APP_NAME,
    postalAddress: clean(process.env.COMPANY_POSTAL_ADDRESS),
    contactEmail: clean(process.env.SUPPORT_EMAIL),
  };
}

export interface DmcaAgent {
  name: string;
  email: string;
  address: string;
  phone: string;
  /** True only when the owner has set the details of an agent registered with the US Copyright Office. */
  designated: boolean;
}

export function dmcaAgent(): DmcaAgent {
  const name = clean(process.env.DMCA_AGENT_NAME);
  const email = clean(process.env.DMCA_AGENT_EMAIL);
  const address = clean(process.env.DMCA_AGENT_ADDRESS);
  return { name, email, address, phone: clean(process.env.DMCA_AGENT_PHONE), designated: Boolean(name && email && address) };
}

/** Signed token for one-click unsubscribe links. Uses the same secret as attendee links. */
function unsubscribeSecret(): string | null {
  const secret = process.env.REGISTRATION_LINK_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function unsubscribeToken(registrationId: string): string | null {
  const secret = unsubscribeSecret();
  return secret ? createHmac("sha256", secret).update(`unsubscribe:${registrationId}`).digest("base64url").slice(0, 32) : null;
}

export function unsubscribeTokenMatches(registrationId: string, candidate: string | null | undefined): boolean {
  const expected = unsubscribeToken(registrationId);
  if (!expected || !candidate || expected.length !== candidate.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(candidate));
}

export function unsubscribeUrl(origin: string, registrationId: string): string | null {
  const token = unsubscribeToken(registrationId);
  return token ? `${origin.replace(/\/+$/, "")}/unsubscribe?r=${encodeURIComponent(registrationId)}&t=${token}` : null;
}

/** Message kinds that are sent only because someone just did something (their own receipt or sign-up). */
const TRANSACTIONAL = new Set(["registration_confirmation", "purchase_confirmation", "host_new_registration", "cancellation_rescheduling"]);
export const isCommercialTemplate = (templateType: string) => !TRANSACTIONAL.has(templateType);
