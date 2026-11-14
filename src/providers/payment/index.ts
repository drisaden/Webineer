import type { PaymentTransaction } from "@/types";

export interface InitializePaymentParams {
  transactionId: string;
  email: string;
  name: string;
  amount: number;
  currency: string;
  webinarId: string;
  ticketTypeId: string;
  callbackUrl: string;
}

export interface PaymentInitializationResult {
  success: boolean;
  authorizationUrl: string;
  reference: string;
  provider: "paystack" | "flutterwave" | "simulated";
  errorMessage?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  reference: string;
  amount: number;
  currency: string;
  status: "completed" | "failed" | "pending";
  errorMessage?: string;
}

export interface PaymentProvider {
  id: "simulated" | "paystack" | "flutterwave";
  name: string;
  initialize(params: InitializePaymentParams): Promise<PaymentInitializationResult>;
  verify(reference: string): Promise<PaymentVerificationResult>;
  verifyWebhook(payload: string, signature: string): boolean;
}

// In-memory transactions store
const inMemoryTransactions: PaymentTransaction[] = [
  {
    id: "tx_001",
    workspaceId: "ws_001",
    webinarId: "wb_001",
    ticketTypeId: "tkt_001",
    attendeeEmail: "jordan@example.com",
    attendeeName: "Jordan Lee",
    amount: 15000,
    currency: "NGN",
    provider: "paystack",
    status: "completed",
    reference: "pstk_ref_982312",
    idempotencyKey: "idem_tx_001",
    createdAt: "2026-11-08T12:00:00Z",
    paidAt: "2026-11-08T12:02:15Z",
  },
  {
    id: "tx_002",
    workspaceId: "ws_001",
    webinarId: "wb_002",
    ticketTypeId: "tkt_002",
    attendeeEmail: "priya@example.com",
    attendeeName: "Priya Shah",
    amount: 25000,
    currency: "NGN",
    provider: "flutterwave",
    status: "completed",
    reference: "flw_ref_441920",
    idempotencyKey: "idem_tx_002",
    createdAt: "2026-11-07T17:15:00Z",
    paidAt: "2026-11-07T17:16:30Z",
  },
  {
    id: "tx_003",
    workspaceId: "ws_001",
    webinarId: "wb_003",
    ticketTypeId: "tkt_003",
    attendeeEmail: "marcus@example.com",
    attendeeName: "Marcus Hall",
    amount: 10000,
    currency: "NGN",
    provider: "simulated",
    status: "completed",
    reference: "sim_ref_551230",
    idempotencyKey: "idem_tx_003",
    createdAt: "2026-11-05T20:10:00Z",
    paidAt: "2026-11-05T20:10:10Z",
  },
];

export class SimulatedPaymentProvider implements PaymentProvider {
  id: "simulated" = "simulated";
  name = "Simulated Test Gateway (Zero Cost)";

  async initialize(params: InitializePaymentParams): Promise<PaymentInitializationResult> {
    const reference = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // In simulated mode, automatically record a pending transaction
    inMemoryTransactions.unshift({
      id: params.transactionId,
      workspaceId: "ws_001",
      webinarId: params.webinarId,
      ticketTypeId: params.ticketTypeId,
      attendeeEmail: params.email,
      attendeeName: params.name,
      amount: params.amount,
      currency: params.currency,
      provider: "simulated",
      status: "pending",
      reference,
      idempotencyKey: `idem_${reference}`,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      authorizationUrl: `${params.callbackUrl}?reference=${reference}&status=success`,
      reference,
      provider: "simulated",
    };
  }

  async verify(reference: string): Promise<PaymentVerificationResult> {
    const tx = inMemoryTransactions.find((t) => t.reference === reference);
    if (tx) {
      tx.status = "completed";
      tx.paidAt = new Date().toISOString();
      return {
        success: true,
        reference,
        amount: tx.amount,
        currency: tx.currency,
        status: "completed",
      };
    }

    return {
      success: true,
      reference,
      amount: 15000,
      currency: "NGN",
      status: "completed",
    };
  }

  verifyWebhook(_payload: string, _signature: string): boolean {
    return true; // Always verified in simulated mode
  }
}

export function getPaymentTransactions(): PaymentTransaction[] {
  return inMemoryTransactions;
}

export function addPaymentTransaction(tx: PaymentTransaction) {
  inMemoryTransactions.unshift(tx);
}

/**
 * Demo mode only. Real payments (database mode) go through Flutterwave in
 * src/server/payments, with server-side verification and webhooks.
 */
export function getActivePaymentProvider(): PaymentProvider {
  return new SimulatedPaymentProvider();
}
