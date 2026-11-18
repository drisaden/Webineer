export type CurrencyCode = "NGN" | "USD" | "EUR" | "GBP";

const EURO = new Set(["AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES"]);

/** The currency a host most likely prices in, from the two-letter country of the connection. Unknown countries use USD. */
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  const c = (country ?? "").trim().toUpperCase();
  if (c === "NG") return "NGN";
  if (c === "GB") return "GBP";
  if (EURO.has(c)) return "EUR";
  return "USD";
}
