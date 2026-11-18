CREATE TYPE "LedgerEntryType" AS ENUM ('SALE', 'REFUND', 'PAYOUT', 'PAYOUT_REVERSAL', 'ADJUSTMENT');
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED');

CREATE TABLE "payout_requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "bank_snapshot" JSONB NOT NULL,
    "requested_by_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "reference" TEXT,
    "admin_note" TEXT,
    "processed_by_id" UUID,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payout_requests_amount_positive" CHECK ("amount" > 0)
);

CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "gross" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "platform_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gateway_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net" DECIMAL(14,2) NOT NULL,
    "available_at" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT NOT NULL,
    "payment_id" UUID,
    "webinar_id" UUID,
    "payout_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payout_accounts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_code" TEXT,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "schedule" TEXT NOT NULL DEFAULT 'manual',
    "minimum_payout" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payout_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "payout_requests_idempotency_key_key" ON "payout_requests"("idempotency_key");
CREATE INDEX "payout_requests_organization_id_created_at_idx" ON "payout_requests"("organization_id", "created_at");
CREATE INDEX "payout_requests_status_created_at_idx" ON "payout_requests"("status", "created_at");
CREATE INDEX "ledger_entries_organization_id_created_at_idx" ON "ledger_entries"("organization_id", "created_at");
CREATE INDEX "ledger_entries_organization_id_currency_available_at_idx" ON "ledger_entries"("organization_id", "currency", "available_at");
CREATE UNIQUE INDEX "ledger_entries_one_sale_per_payment" ON "ledger_entries"("payment_id", "type") WHERE "payment_id" IS NOT NULL;
CREATE UNIQUE INDEX "payout_accounts_organization_id_key" ON "payout_accounts"("organization_id");

ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payout_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payout_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payout_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_settings" ENABLE ROW LEVEL SECURITY;
