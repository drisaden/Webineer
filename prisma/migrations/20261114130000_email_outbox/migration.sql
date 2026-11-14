-- Phase 5: email outbox content (cleared after delivery)
ALTER TABLE "email_logs" ADD COLUMN "body_html" TEXT;
ALTER TABLE "email_logs" ADD COLUMN "body_text" TEXT;
