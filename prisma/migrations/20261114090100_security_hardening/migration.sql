-- Security hardening that Prisma's schema language cannot express.
-- Prisma Migrate preserves CHECK constraints and RLS settings it does not manage.

-- 1. Row Level Security
-- The application talks to Postgres through Prisma using a privileged role
-- (table owner / BYPASSRLS), so RLS does not apply to it, tenant isolation is
-- enforced in the server data layer (src/server/db). RLS is enabled here
-- WITHOUT policies so Supabase's auto-generated Data API (anon and
-- authenticated keys usable from browsers) can neither read nor write rows.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_admins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webinars" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "presenters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webinar_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "landing_pages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- 2. Data integrity checks
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_email_lowercase" CHECK ("email" = lower("email"));
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_email_lowercase" CHECK ("email" = lower("email"));

ALTER TABLE "organizations" ADD CONSTRAINT "organizations_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_duration_positive" CHECK ("duration_minutes" > 0);
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_counts_non_negative" CHECK ("registration_count" >= 0 AND "attendee_count" >= 0);
ALTER TABLE "webinar_sessions" ADD CONSTRAINT "webinar_sessions_ends_after_start" CHECK ("ends_at" > "starts_at");

-- Ticket payments belong to a webinar registration, subscription payments to a
-- subscription. A payment can never be both.
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_purpose_links" CHECK (
  ("purpose" = 'WEBINAR_TICKET' AND "subscription_id" IS NULL AND "webinar_id" IS NOT NULL)
  OR ("purpose" = 'PLATFORM_SUBSCRIPTION' AND "registration_id" IS NULL AND "webinar_id" IS NULL)
);
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_amount_non_negative" CHECK ("amount" >= 0);

ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_attempts_valid" CHECK ("attempts" >= 0 AND "max_attempts" > 0);
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_attempts_valid" CHECK ("attempts" >= 0);
