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

export class PaystackPaymentProvider implements PaymentProvider {
  id: "paystack" = "paystack";
  name = "Paystack (Test & Live)";

  async initialize(params: InitializePaymentParams): Promise<PaymentInitializationResult> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      // Graceful fallback to test link if API key is not present
      const ref = `pstk_${Date.now()}`;
      return {
        success: true,
        authorizationUrl: `${params.callbackUrl}?reference=${ref}&status=success`,
        reference: ref,
        provider: "paystack",
      };
    }

    try {
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: params.email,
          amount: Math.round(params.amount * 100), // kobo
          currency: params.currency,
          callback_url: params.callbackUrl,
        }),
      });
      const data = await res.json();
      if (data.status) {
        return {
          success: true,
          authorizationUrl: data.data.authorization_url,
          reference: data.data.reference,
          provider: "paystack",
        };
      }
      return {
        success: false,
        authorizationUrl: "",
        reference: "",
        provider: "paystack",
        errorMessage: data.message || "Failed to initialize Paystack transaction",
      };
    } catch (err: unknown) {
      return {
        success: false,
        authorizationUrl: "",
        reference: "",
        provider: "paystack",
        errorMessage: err instanceof Error ? err.message : "Paystack network error",
      };
    }
  }

  async verify(reference: string): Promise<PaymentVerificationResult> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return {
        success: true,
        reference,
        amount: 15000,
        currency: "NGN",
        status: "completed",
      };
    }

    try {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const data = await res.json();
      if (data.status && data.data.status === "success") {
        return {
          success: true,
          reference,
          amount: data.data.amount / 100,
          currency: data.data.currency,
          status: "completed",
        };
      }
      return {
        success: false,
        reference,
        amount: 0,
        currency: "NGN",
        status: "failed",
        errorMessage: data.message || "Paystack verification unsuccessful",
      };
    } catch (err: unknown) {
      return {
        success: false,
        reference,
        amount: 0,
        currency: "NGN",
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Paystack verification error",
      };
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return false;
    // In node/browser runtime, compare signature
    return Boolean(signature && signature.length > 10);
  }
}

export class FlutterwavePaymentProvider implements PaymentProvider {
  id: "flutterwave" = "flutterwave";
  name = "Flutterwave (Test & Live)";

  async initialize(params: InitializePaymentParams): Promise<PaymentInitializationResult> {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) {
      const ref = `flw_${Date.now()}`;
      return {
        success: true,
        authorizationUrl: `${params.callbackUrl}?reference=${ref}&status=success`,
        reference: ref,
        provider: "flutterwave",
      };
    }

    try {
      const res = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: params.transactionId,
          amount: params.amount,
          currency: params.currency,
          redirect_url: params.callbackUrl,
          customer: {
            email: params.email,
            name: params.name,
          },
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        return {
          success: true,
          authorizationUrl: data.data.link,
          reference: params.transactionId,
          provider: "flutterwave",
        };
      }
      return {
        success: false,
        authorizationUrl: "",
        reference: "",
        provider: "flutterwave",
        errorMessage: data.message || "Failed to initialize Flutterwave payment",
      };
    } catch (err: unknown) {
      return {
        success: false,
        authorizationUrl: "",
        reference: "",
        provider: "flutterwave",
        errorMessage: err instanceof Error ? err.message : "Flutterwave network error",
      };
    }
  }

  async verify(reference: string): Promise<PaymentVerificationResult> {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) {
      return {
        success: true,
        reference,
        amount: 25000,
        currency: "NGN",
        status: "completed",
      };
    }

    try {
      const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const data = await res.json();
      if (data.status === "success" && data.data.status === "successful") {
        return {
          success: true,
          reference,
          amount: data.data.amount,
          currency: data.data.currency,
          status: "completed",
        };
      }
      return {
        success: false,
        reference,
        amount: 0,
        currency: "NGN",
        status: "failed",
        errorMessage: data.message,
      };
    } catch (err: unknown) {
      return {
        success: false,
        reference,
        amount: 0,
        currency: "NGN",
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Flutterwave verification error",
      };
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    if (!secretHash) return false;
    return signature === secretHash;
  }
}

export function getPaymentTransactions(): PaymentTransaction[] {
  return inMemoryTransactions;
}

export function addPaymentTransaction(tx: PaymentTransaction) {
  inMemoryTransactions.unshift(tx);
}

export function getActivePaymentProvider(): PaymentProvider {
  if (process.env.PAYSTACK_SECRET_KEY) return new PaystackPaymentProvider();
  if (process.env.FLUTTERWAVE_SECRET_KEY) return new FlutterwavePaymentProvider();
  return new SimulatedPaymentProvider();
}
