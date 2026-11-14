import { getAuthMode } from "@/lib/supabase/config";
import { getPaymentTransactions } from "@/providers/payment";
import { ORG_ROLE_PERMISSIONS } from "@/server/auth/permissions";
import { getAppSession } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";
import { flutterwaveConfig } from "./flutterwave";

export interface LedgerRow {
  id: string;
  name: string;
  detail: string;
  status: "completed" | "pending" | "failed";
  amount: number;
  currency: string;
  reference: string;
  date: string;
}

export interface TicketLedger {
  mode: "demo" | "live";
  allowed: boolean;
  provider: string;
  testMode: boolean;
  configured: boolean;
  webhookConfigured: boolean;
  rows: LedgerRow[];
}

const SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", EUR: "€", GBP: "£" };
export const formatMoney = (amount: number, currency: string) => `${SYMBOLS[currency] ?? `${currency} `}${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

/** Ticket payments for the active workspace (subscription payments are shown under Billing). */
export async function getTicketLedger(limit = 200): Promise<TicketLedger | null> {
  if (getAuthMode() !== "supabase") {
    return {
      mode: "demo",
      allowed: true,
      provider: "Simulated",
      testMode: true,
      configured: false,
      webhookConfigured: false,
      rows: getPaymentTransactions().map((t) => ({
        id: t.id,
        name: t.attendeeName,
        detail: `${t.webinarId} · ${t.provider}`,
        status: t.status === "completed" ? "completed" : t.status === "pending" ? "pending" : "failed",
        amount: t.amount,
        currency: t.currency,
        reference: t.reference,
        date: t.createdAt,
      })),
    };
  }
  const app = await getAppSession();
  if (!app) return null;
  const cfg = flutterwaveConfig();
  const base = { mode: "live" as const, provider: "Flutterwave", testMode: cfg?.testMode ?? true, configured: !!cfg, webhookConfigured: !!cfg?.secretHash };
  if (!ORG_ROLE_PERMISSIONS[app.role].includes("payment.view")) return { ...base, allowed: false, rows: [] };
  const payments = await getPrisma().payment.findMany({
    where: { organizationId: app.organization.id, purpose: "WEBINAR_TICKET" },
    include: { webinar: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return {
    ...base,
    allowed: true,
    rows: payments.map((p) => ({
      id: p.id,
      name: p.customerName || p.customerEmail,
      detail: `${p.webinar?.title ?? "Webinar"} · Flutterwave`,
      status: p.status === "SUCCESSFUL" ? "completed" : p.status === "PENDING" ? "pending" : "failed",
      amount: Number(p.amount),
      currency: p.currency,
      reference: p.txRef,
      date: p.createdAt.toISOString(),
    })),
  };
}
