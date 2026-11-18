const SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", EUR: "€", GBP: "£" };
export const formatMoney = (amount: number, currency: string) => `${SYMBOLS[currency] ?? `${currency} `}${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
