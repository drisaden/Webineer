-- Phase 4: purchase details for Flutterwave payments
ALTER TABLE "payments" ADD COLUMN "metadata" JSONB;
