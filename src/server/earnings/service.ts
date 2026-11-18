import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { feeFor, getHoldDays, getPlatformFeePercent } from "./settings";

type Tx = Prisma.TransactionClient;
export type Currency = "NGN" | "USD" | "EUR" | "GBP";

export class EarningsError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const num = (d: Prisma.Decimal | number | null | undefined) => Number(d ?? 0);
const minor = (n: number) => Math.round(n * 100);
const dec = (n: number) => new Prisma.Decimal(n.toFixed(2));

/** Records a sale for the host. Called inside the transaction that marks the payment successful. */
export async function recordSale(tx: Tx, payment: { id: string; organizationId: string; webinarId: string | null; amount: Prisma.Decimal; currency: Currency; customerEmail: string }, gatewayFee: number | null) {
  const percent = await getPlatformFeePercent(tx as never);
  const hold = await getHoldDays(tx as never);
  const gross = num(payment.amount);
  const platformFee = Math.min(gross, feeFor(gross, percent));
  const net = Math.round((gross - platformFee) * 100) / 100;
  await tx.ledgerEntry.create({
    data: {
      organizationId: payment.organizationId,
      type: "SALE",
      currency: payment.currency,
      gross: dec(gross),
      platformFee: dec(platformFee),
      gatewayFee: dec(gatewayFee && gatewayFee > 0 ? gatewayFee : 0),
      net: dec(net),
      availableAt: new Date(Date.now() + hold * 86_400_000),
      description: "Ticket sale",
      paymentId: payment.id,
      webinarId: payment.webinarId,
    },
  });
}

/** Takes a sale back out of the host's balance (full refund). Safe to call twice. */
export async function recordRefund(paymentId: string, reason = "Refund") {
  const db = getPrisma();
  return db.$transaction(async (tx) => {
    const sale = await tx.ledgerEntry.findFirst({ where: { paymentId, type: "SALE" } });
    if (!sale) return null;
    const exists = await tx.ledgerEntry.findFirst({ where: { paymentId, type: "REFUND" } });
    if (exists) return exists;
    return tx.ledgerEntry.create({
      data: { organizationId: sale.organizationId, type: "REFUND", currency: sale.currency, gross: sale.gross.neg(), platformFee: sale.platformFee.neg(), gatewayFee: 0, net: sale.net.neg(), availableAt: new Date(), description: reason, paymentId, webinarId: sale.webinarId },
    });
  });
}

export interface Balance { currency: Currency; available: number; pending: number; inReview: number; withdrawn: number; lifetimeNet: number; lifetimeGross: number; platformFees: number }

export async function getBalances(organizationId: string, db: Pick<Tx, "ledgerEntry" | "payoutRequest"> = getPrisma()): Promise<Balance[]> {
  const now = new Date();
  const [entries, payouts] = await Promise.all([
    db.ledgerEntry.findMany({ where: { organizationId }, select: { currency: true, type: true, net: true, gross: true, platformFee: true, availableAt: true } }),
    db.payoutRequest.groupBy({ by: ["currency", "status"], where: { organizationId, status: { in: ["REQUESTED", "APPROVED", "PAID"] } }, _sum: { amount: true } }),
  ]);
  const map = new Map<Currency, Balance>();
  const get = (c: Currency) => map.get(c) ?? map.set(c, { currency: c, available: 0, pending: 0, inReview: 0, withdrawn: 0, lifetimeNet: 0, lifetimeGross: 0, platformFees: 0 }).get(c)!;
  for (const e of entries) {
    const b = get(e.currency as Currency);
    const n = num(e.net);
    if (e.availableAt <= now) b.available += n; else b.pending += n;
    if (e.type === "SALE" || e.type === "REFUND") { b.lifetimeNet += n; b.lifetimeGross += num(e.gross); b.platformFees += num(e.platformFee) * (e.type === "REFUND" ? -1 : 1); }
  }
  for (const p of payouts) {
    const b = get(p.currency as Currency);
    const a = num(p._sum.amount);
    if (p.status === "PAID") b.withdrawn += a; else b.inReview += a;
  }
  return [...map.values()].map((b) => ({ ...b, available: round(b.available), pending: round(b.pending), inReview: round(b.inReview), withdrawn: round(b.withdrawn), lifetimeNet: round(b.lifetimeNet), lifetimeGross: round(b.lifetimeGross), platformFees: round(b.platformFees) }));
}
const round = (n: number) => Math.round(n * 100) / 100;

// ───────── payout account ─────────

export interface PayoutAccountInput { bankName: string; bankCode?: string | null; accountNumber: string; accountName: string; schedule: "manual" | "weekly" | "monthly"; minimumPayout: number }

export const maskAccount = (n: string) => (n.length <= 4 ? "••••" : `•••• ${n.slice(-4)}`);

export function validatePayoutAccount(i: PayoutAccountInput, keepNumber = false): string | null {
  if (i.bankName.trim().length < 2 || i.bankName.length > 80) return "Enter the bank name.";
  if (!(keepNumber && i.accountNumber === "") && !/^\d{10}$/.test(i.accountNumber)) return "Account numbers have 10 digits.";
  if (i.accountName.trim().length < 2 || i.accountName.length > 120) return "Enter the account name exactly as the bank has it.";
  if (!["manual", "weekly", "monthly"].includes(i.schedule)) return "Choose a payout schedule.";
  if (!Number.isFinite(i.minimumPayout) || i.minimumPayout < 0 || i.minimumPayout > 100_000_000) return "Enter a valid minimum amount.";
  return null;
}

export async function getPayoutAccount(organizationId: string) {
  const a = await getPrisma().payoutAccount.findUnique({ where: { organizationId } });
  if (!a) return null;
  return { bankName: a.bankName, bankCode: a.bankCode, accountMasked: maskAccount(a.accountNumber), accountName: a.accountName, schedule: a.schedule as PayoutAccountInput["schedule"], minimumPayout: num(a.minimumPayout) };
}

export async function savePayoutAccount(organizationId: string, input: PayoutAccountInput) {
  const existing = await getPrisma().payoutAccount.findUnique({ where: { organizationId } });
  const bad = validatePayoutAccount(input, !!existing);
  if (bad) throw new EarningsError(bad);
  const data = { bankName: input.bankName.trim(), bankCode: input.bankCode?.trim() || null, accountNumber: input.accountNumber || existing!.accountNumber, accountName: input.accountName.trim(), schedule: input.schedule, minimumPayout: dec(input.minimumPayout) };
  await getPrisma().payoutAccount.upsert({ where: { organizationId }, create: { organizationId, ...data }, update: data });
}

// ───────── withdrawals ─────────

export async function requestPayout(args: { organizationId: string; userId: string | null; amount: number; currency: Currency; idempotencyKey: string }) {
  const db = getPrisma();
  if (!Number.isFinite(args.amount) || args.amount <= 0) throw new EarningsError("Enter an amount to withdraw.");
  if (minor(args.amount) !== Math.round(args.amount * 100) || args.amount > 1_000_000_000) throw new EarningsError("Enter a valid amount.");
  const prior = await db.payoutRequest.findUnique({ where: { idempotencyKey: args.idempotencyKey } });
  if (prior) return prior.organizationId === args.organizationId ? prior : (() => { throw new EarningsError("Request not found.", 404); })();
  try {
    return await db.$transaction(async (tx) => {
      // One withdrawal at a time per workspace, so two requests can't both spend the same balance.
      await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${args.organizationId}::uuid FOR UPDATE`;
      const account = await tx.payoutAccount.findUnique({ where: { organizationId: args.organizationId } });
      if (!account) throw new EarningsError("Add your bank account in payout settings first.", 409);
      const available = (await getBalances(args.organizationId, tx)).find((b) => b.currency === args.currency)?.available ?? 0;
      if (minor(args.amount) > minor(available)) throw new EarningsError(`You can withdraw up to ${available.toLocaleString("en-US", { minimumFractionDigits: 2 })} right now.`, 422);
      if (args.amount < num(account.minimumPayout)) throw new EarningsError(`The minimum withdrawal in your settings is ${num(account.minimumPayout).toLocaleString("en-US")}.`, 422);
      const payout = await tx.payoutRequest.create({
        data: {
          organizationId: args.organizationId, amount: dec(args.amount), currency: args.currency, requestedById: args.userId, idempotencyKey: args.idempotencyKey,
          bankSnapshot: { bankName: account.bankName, bankCode: account.bankCode, accountNumber: account.accountNumber, accountName: account.accountName },
        },
      });
      await tx.ledgerEntry.create({ data: { organizationId: args.organizationId, type: "PAYOUT", currency: args.currency, net: dec(-args.amount), availableAt: new Date(), description: "Withdrawal requested", payoutId: payout.id } });
      return payout;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const again = await db.payoutRequest.findUnique({ where: { idempotencyKey: args.idempotencyKey } });
      if (again && again.organizationId === args.organizationId) return again;
    }
    throw error;
  }
}

/** The host can withdraw a request before an administrator picks it up. */
export async function cancelPayout(organizationId: string, payoutId: string) {
  return finishPayout({ payoutId, organizationId, from: ["REQUESTED"], to: "CANCELLED", reverse: true, note: "Cancelled by you" });
}

async function finishPayout(a: { payoutId: string; organizationId?: string; from: ("REQUESTED" | "APPROVED")[]; to: "APPROVED" | "PAID" | "REJECTED" | "CANCELLED"; reverse?: boolean; note?: string | null; reference?: string | null; adminId?: string | null }) {
  return getPrisma().$transaction(async (tx) => {
    const won = await tx.payoutRequest.updateMany({
      where: { id: a.payoutId, ...(a.organizationId ? { organizationId: a.organizationId } : {}), status: { in: a.from } },
      data: { status: a.to, adminNote: a.note ?? undefined, reference: a.reference ?? undefined, processedById: a.adminId ?? undefined, processedAt: a.to === "CANCELLED" ? undefined : new Date() },
    });
    if (won.count !== 1) {
      const row = await tx.payoutRequest.findFirst({ where: { id: a.payoutId, ...(a.organizationId ? { organizationId: a.organizationId } : {}) } });
      if (!row) throw new EarningsError("Request not found.", 404);
      throw new EarningsError(`This request is already ${row.status.toLowerCase()}.`, 409);
    }
    const p = await tx.payoutRequest.findUniqueOrThrow({ where: { id: a.payoutId } });
    if (a.reverse) {
      await tx.ledgerEntry.create({ data: { organizationId: p.organizationId, type: "PAYOUT_REVERSAL", currency: p.currency, net: p.amount, availableAt: new Date(), description: a.to === "REJECTED" ? "Withdrawal declined, money returned" : "Withdrawal cancelled", payoutId: p.id } });
    }
    return p;
  });
}

export const approvePayout = (payoutId: string, adminId: string | null) => finishPayout({ payoutId, from: ["REQUESTED"], to: "APPROVED", adminId });
export const markPayoutPaid = async (payoutId: string, adminId: string | null, reference: string) => {
  if (reference.trim().length < 3 || reference.length > 120) throw new EarningsError("Enter the transfer reference.");
  return finishPayout({ payoutId, from: ["APPROVED"], to: "PAID", adminId, reference: reference.trim() });
};
export const rejectPayout = async (payoutId: string, adminId: string | null, note: string) => {
  if (note.trim().length < 3 || note.length > 500) throw new EarningsError("Tell the host why it was declined.");
  return finishPayout({ payoutId, from: ["REQUESTED", "APPROVED"], to: "REJECTED", reverse: true, adminId, note: note.trim() });
};

// ───────── reporting ─────────

export async function listTransactions(organizationId: string, take = 200) {
  const rows = await getPrisma().ledgerEntry.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take, include: { payment: { select: { customerEmail: true, customerName: true, txRef: true, webinar: { select: { title: true } } } } } });
  return rows.map((r) => ({
    id: r.id, type: r.type, date: r.createdAt.toISOString(), description: r.description, currency: r.currency as Currency,
    gross: num(r.gross), platformFee: num(r.platformFee), net: num(r.net), availableAt: r.availableAt.toISOString(),
    buyer: r.payment?.customerName || r.payment?.customerEmail || "", webinar: r.payment?.webinar?.title ?? "", reference: r.payment?.txRef ?? "",
  }));
}

export type TransactionRow = Awaited<ReturnType<typeof listTransactions>>[number];

const csvCell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // spreadsheet formula guard
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function transactionsCsv(rows: TransactionRow[]): string {
  const head = ["Date", "Type", "Webinar", "Buyer", "Currency", "Gross", "Platform fee", "Net", "Reference"];
  return [head, ...rows.map((r) => [r.date, r.type, r.webinar, r.buyer, r.currency, r.gross, r.platformFee, r.net, r.reference])].map((l) => l.map(csvCell).join(",")).join("\r\n");
}

export async function earningsAnalytics(organizationId: string, days = 30) {
  const db = getPrisma();
  const since = new Date(Date.now() - days * 86_400_000);
  const sales = await db.ledgerEntry.findMany({ where: { organizationId, type: { in: ["SALE", "REFUND"] }, createdAt: { gte: since } }, select: { type: true, net: true, gross: true, createdAt: true, webinarId: true, currency: true } });
  const perDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) perDay.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), 0);
  const perWebinar = new Map<string, { net: number; sales: number }>();
  let refunds = 0;
  for (const s of sales) {
    const day = s.createdAt.toISOString().slice(0, 10);
    perDay.set(day, round((perDay.get(day) ?? 0) + num(s.net)));
    const w = perWebinar.get(s.webinarId ?? "") ?? { net: 0, sales: 0 };
    w.net += num(s.net);
    if (s.type === "SALE") w.sales += 1; else refunds += 1;
    perWebinar.set(s.webinarId ?? "", w);
  }
  const ids = [...perWebinar.keys()].filter(Boolean);
  const [webinars, regs] = await Promise.all([
    db.webinar.findMany({ where: { id: { in: ids }, organizationId }, select: { id: true, title: true } }),
    db.registration.groupBy({ by: ["webinarId"], where: { organizationId, webinarId: { in: ids } }, _count: { _all: true } }),
  ]);
  const title = new Map(webinars.map((w) => [w.id, w.title]));
  const registered = new Map(regs.map((r) => [r.webinarId, r._count._all]));
  return {
    days,
    series: [...perDay.entries()].map(([date, net]) => ({ date, net })),
    refunds,
    webinars: [...perWebinar.entries()].filter(([id]) => id).map(([id, w]) => ({ id, title: title.get(id) ?? "Webinar", net: round(w.net), sales: w.sales, registered: registered.get(id) ?? 0, conversion: registered.get(id) ? Math.round((w.sales / (registered.get(id) as number)) * 1000) / 10 : 0 })).sort((a, b) => b.net - a.net),
  };
}

export async function listPayouts(organizationId: string) {
  const rows = await getPrisma().payoutRequest.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 100 });
  return rows.map((r) => {
    const s = r.bankSnapshot as { bankName?: string; accountNumber?: string };
    return { id: r.id, amount: num(r.amount), currency: r.currency as Currency, status: r.status, createdAt: r.createdAt.toISOString(), processedAt: r.processedAt?.toISOString() ?? null, reference: r.reference, note: r.status === "REJECTED" ? r.adminNote : null, bank: `${s.bankName ?? "Bank"} ${maskAccount(s.accountNumber ?? "")}` };
  });
}

/** For the admin queue. Full account numbers are shown to administrators only. */
export async function adminPayoutQueue(status?: string) {
  const rows = await getPrisma().payoutRequest.findMany({ where: status ? { status: status as never } : {}, orderBy: [{ createdAt: "asc" }], take: 200, include: { organization: { select: { name: true } } } });
  return rows.map((r) => {
    const s = r.bankSnapshot as { bankName?: string; accountNumber?: string; accountName?: string };
    return { id: r.id, workspace: r.organization.name, amount: num(r.amount), currency: r.currency as Currency, status: r.status, createdAt: r.createdAt.toISOString(), bankName: s.bankName ?? "", accountNumber: s.accountNumber ?? "", accountName: s.accountName ?? "", reference: r.reference, note: r.adminNote };
  });
}
