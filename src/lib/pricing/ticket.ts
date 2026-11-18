export type TicketCurrency = "NGN" | "USD" | "EUR" | "GBP";

export interface TicketTier {
  id: string;
  name: string;
  /** Major units. 0 makes the tier free. */
  price: number;
  description: string;
}

export interface DiscountCode {
  /** Stored upper-case, letters, digits, dash and underscore. */
  code: string;
  /** One of these is set: a percentage (1-100) or a fixed amount off. */
  percentOff?: number;
  amountOff?: number;
  /** null = unlimited. */
  maxUses: number | null;
  /** ISO date or null. The code works until the end of that day. */
  expiresAt: string | null;
  active: boolean;
}

export interface TicketPaymentSettings {
  enabled: boolean;
  price: number;
  currency: TicketCurrency;
  tiers?: TicketTier[];
  discountCodes?: DiscountCode[];
}

export class PricingError extends Error {
  constructor(message: string, readonly field: "tier" | "code") {
    super(message);
  }
}

export interface ResolvedPrice {
  /** What the buyer pays now, in major units. 0 means no payment. */
  amount: number;
  currency: TicketCurrency;
  tier: { id: string; name: string } | null;
  /** The code that was applied, if any. */
  code: string | null;
  discount: number;
  /** Before any discount. */
  base: number;
}

export const normaliseCode = (raw: string) => raw.trim().toUpperCase();
export const CODE_PATTERN = /^[A-Z0-9_-]{3,24}$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function usesTiers(p: TicketPaymentSettings): boolean {
  return p.enabled && (p.tiers?.length ?? 0) > 0;
}

/** Lowest price a visitor could pay, shown as "from" on the page. */
export function lowestPrice(p: TicketPaymentSettings): number {
  if (!p.enabled) return 0;
  return usesTiers(p) ? Math.min(...p.tiers!.map((t) => t.price)) : p.price;
}

/**
 * The price for a visitor's choices. `usedBy(code)` says how many people already used a code.
 * Wrong, expired, used-up and switched-off codes all get the same answer so codes can't be guessed.
 */
export function resolveTicketPrice(p: TicketPaymentSettings, choice: { tierId?: string; code?: string }, usedBy: (code: string) => number, now: Date = new Date()): ResolvedPrice {
  if (!p.enabled) return { amount: 0, currency: p.currency, tier: null, code: null, discount: 0, base: 0 };
  let base = p.price;
  let tier: ResolvedPrice["tier"] = null;
  if (usesTiers(p)) {
    const chosen = p.tiers!.find((t) => t.id === choice.tierId);
    if (!chosen) throw new PricingError("Choose a ticket.", "tier");
    base = chosen.price;
    tier = { id: chosen.id, name: chosen.name };
  }
  const entered = normaliseCode(choice.code ?? "");
  if (!entered) return { amount: round2(base), currency: p.currency, tier, code: null, discount: 0, base: round2(base) };
  const invalid = new PricingError("That code isn't valid.", "code");
  const found = (p.discountCodes ?? []).find((c) => c.code === entered);
  if (!found || !found.active) throw invalid;
  if (found.expiresAt && now.getTime() > Date.parse(`${found.expiresAt.slice(0, 10)}T23:59:59.999Z`)) throw invalid;
  if (found.maxUses != null && usedBy(found.code) >= found.maxUses) throw invalid;
  let discount = found.percentOff ? (base * found.percentOff) / 100 : (found.amountOff ?? 0);
  discount = round2(Math.min(base, Math.max(0, discount)));
  return { amount: round2(base - discount), currency: p.currency, tier, code: found.code, discount, base: round2(base) };
}

/** Problems with the settings a host typed in, in plain words. */
export function validateTicketSettings(p: TicketPaymentSettings): string[] {
  const issues: string[] = [];
  const tiers = p.tiers ?? [];
  if (tiers.length > 5) issues.push("Use at most 5 ticket options.");
  const ids = new Set<string>();
  tiers.forEach((t, i) => {
    if (!t.name.trim()) issues.push(`Give ticket option ${i + 1} a name.`);
    if (!Number.isFinite(t.price) || t.price < 0 || t.price > 100_000_000) issues.push(`Ticket option ${i + 1} needs a price of 0 or more.`);
    if (ids.has(t.id)) issues.push("Two ticket options share the same id.");
    ids.add(t.id);
  });
  const codes = p.discountCodes ?? [];
  if (codes.length > 20) issues.push("Use at most 20 discount codes.");
  const seen = new Set<string>();
  for (const c of codes) {
    if (!CODE_PATTERN.test(c.code)) issues.push(`"${c.code}" isn't a valid code. Use 3 to 24 letters, numbers, dashes or underscores.`);
    if (seen.has(c.code)) issues.push(`The code ${c.code} is listed twice.`);
    seen.add(c.code);
    const pct = c.percentOff ?? 0;
    const amt = c.amountOff ?? 0;
    if ((pct > 0) === (amt > 0)) issues.push(`${c.code}: set either a percentage or an amount off.`);
    if (pct && (pct < 1 || pct > 100)) issues.push(`${c.code}: the percentage must be between 1 and 100.`);
    if (amt && (!Number.isFinite(amt) || amt <= 0)) issues.push(`${c.code}: the amount off must be more than 0.`);
    if (c.maxUses != null && (!Number.isInteger(c.maxUses) || c.maxUses < 1)) issues.push(`${c.code}: the use limit must be a whole number above 0.`);
    if (c.expiresAt && Number.isNaN(Date.parse(c.expiresAt))) issues.push(`${c.code}: the expiry date isn't valid.`);
  }
  if (p.enabled && !tiers.length && p.price <= 0 && codes.length) issues.push("Discount codes need a ticket price above 0.");
  return issues;
}
