-- Notification bell: remember when each user last opened it. Additive and nullable, no backfill, no existing data touched.
ALTER TABLE "users" ADD COLUMN "notifications_seen_at" TIMESTAMPTZ(6);
