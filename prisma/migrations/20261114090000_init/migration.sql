-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN', 'TECHNICAL_ADMIN');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'HOST', 'ANALYST');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('NGN', 'USD', 'EUR', 'GBP');

-- CreateEnum
CREATE TYPE "WebinarStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WebinarType" AS ENUM ('LIVE', 'AUTOMATED', 'EVERGREEN', 'ON_DEMAND', 'RECURRING');

-- CreateEnum
CREATE TYPE "WebinarMode" AS ENUM ('RIGHT_NOW', 'SCHEDULE_LATER', 'ALWAYS_ON');

-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('YOUTUBE', 'VIMEO', 'WISTIA', 'CUSTOM_IFRAME', 'CUSTOM_URL', 'UPLOADED_VIDEO', 'EXTERNAL_LIVE_STREAM');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LandingPageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('HOSTED', 'INLINE', 'POPUP', 'BUTTON', 'DIRECT', 'IMPORT');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'ATTENDED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationPaymentStatus" AS ENUM ('FREE', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('WEBINAR_TICKET', 'PLATFORM_SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('FLUTTERWAVE', 'SIMULATED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "title" TEXT,
    "avatar_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ(6),
    "last_sign_in_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "granted_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "PlanCode" NOT NULL DEFAULT 'FREE',
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "currency" "CurrencyCode" NOT NULL DEFAULT 'NGN',
    "branding" JSONB,
    "custom_domain" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OrgRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "invited_by_id" UUID,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webinars" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "owner_id" UUID,
    "slug" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "WebinarStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "WebinarType" NOT NULL DEFAULT 'LIVE',
    "mode" "WebinarMode",
    "category" TEXT,
    "cover_image_url" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "video_provider" "VideoProvider",
    "video_url" TEXT,
    "workflow" JSONB,
    "workflow_version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "registration_count" INTEGER NOT NULL DEFAULT 0,
    "attendee_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "webinars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presenters" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "webinar_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "email" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "presenters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webinar_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "webinar_id" UUID NOT NULL,
    "source_key" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
    "capacity" INTEGER,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "webinar_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "webinar_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "LandingPageStatus" NOT NULL DEFAULT 'DRAFT',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "webinar_id" UUID NOT NULL,
    "session_id" UUID,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "source" "RegistrationSource" NOT NULL DEFAULT 'DIRECT',
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "payment_status" "RegistrationPaymentStatus" NOT NULL DEFAULT 'FREE',
    "session_starts_at" TIMESTAMPTZ(6),
    "embed_origin" TEXT,
    "metadata" JSONB,
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendees" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "webinar_id" UUID NOT NULL,
    "registration_id" UUID,
    "session_id" UUID,
    "name" TEXT,
    "email" TEXT,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),
    "watch_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "cta_clicked" BOOLEAN NOT NULL DEFAULT false,
    "device" TEXT,

    CONSTRAINT "attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "tx_ref" TEXT NOT NULL,
    "provider_transaction_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "webinar_id" UUID,
    "registration_id" UUID,
    "subscription_id" UUID,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT,
    "checkout_url" TEXT,
    "verification" JSONB,
    "failure_reason" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "provider" "PaymentProvider" NOT NULL,
    "event_type" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "signature_valid" BOOLEAN,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan" "PlanCode" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_subscription_id" TEXT,
    "current_period_start" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "webinar_id" UUID,
    "registration_id" UUID,
    "template" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "to_name" TEXT,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL DEFAULT 'smtp',
    "provider_message_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "dedupe_key" TEXT,
    "scheduled_for" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "dedupe_key" TEXT,
    "locked_at" TIMESTAMPTZ(6),
    "locked_by" TEXT,
    "last_error" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "automation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "JobRunStatus" NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "error" TEXT,
    "output" JSONB,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "webinar_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "registration_id" UUID,
    "anonymous_id" TEXT,
    "device" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "actor_user_id" UUID,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_user_id_key" ON "platform_admins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_custom_domain_key" ON "organizations"("custom_domain");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organization_id_user_id_key" ON "memberships"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_organization_id_status_idx" ON "invitations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "webinars_slug_key" ON "webinars"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "webinars_public_id_key" ON "webinars"("public_id");

-- CreateIndex
CREATE INDEX "webinars_organization_id_status_idx" ON "webinars"("organization_id", "status");

-- CreateIndex
CREATE INDEX "webinars_organization_id_starts_at_idx" ON "webinars"("organization_id", "starts_at");

-- CreateIndex
CREATE INDEX "webinars_status_starts_at_idx" ON "webinars"("status", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "webinars_id_organization_id_key" ON "webinars"("id", "organization_id");

-- CreateIndex
CREATE INDEX "presenters_webinar_id_organization_id_idx" ON "presenters"("webinar_id", "organization_id");

-- CreateIndex
CREATE INDEX "presenters_organization_id_idx" ON "presenters"("organization_id");

-- CreateIndex
CREATE INDEX "webinar_sessions_webinar_id_organization_id_idx" ON "webinar_sessions"("webinar_id", "organization_id");

-- CreateIndex
CREATE INDEX "webinar_sessions_organization_id_starts_at_idx" ON "webinar_sessions"("organization_id", "starts_at");

-- CreateIndex
CREATE INDEX "webinar_sessions_status_starts_at_idx" ON "webinar_sessions"("status", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "webinar_sessions_webinar_id_source_key_key" ON "webinar_sessions"("webinar_id", "source_key");

-- CreateIndex
CREATE UNIQUE INDEX "webinar_sessions_id_organization_id_key" ON "webinar_sessions"("id", "organization_id");

-- CreateIndex
CREATE INDEX "landing_pages_webinar_id_organization_id_idx" ON "landing_pages"("webinar_id", "organization_id");

-- CreateIndex
CREATE INDEX "landing_pages_organization_id_status_idx" ON "landing_pages"("organization_id", "status");

-- CreateIndex
CREATE INDEX "registrations_organization_id_registered_at_idx" ON "registrations"("organization_id", "registered_at");

-- CreateIndex
CREATE INDEX "registrations_webinar_id_organization_id_status_idx" ON "registrations"("webinar_id", "organization_id", "status");

-- CreateIndex
CREATE INDEX "registrations_email_idx" ON "registrations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_webinar_id_email_key" ON "registrations"("webinar_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_id_organization_id_key" ON "registrations"("id", "organization_id");

-- CreateIndex
CREATE INDEX "attendees_webinar_id_organization_id_idx" ON "attendees"("webinar_id", "organization_id");

-- CreateIndex
CREATE INDEX "attendees_registration_id_idx" ON "attendees"("registration_id");

-- CreateIndex
CREATE INDEX "attendees_organization_id_joined_at_idx" ON "attendees"("organization_id", "joined_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_tx_ref_key" ON "payments"("tx_ref");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_transaction_id_key" ON "payments"("provider_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_organization_id_purpose_created_at_idx" ON "payments"("organization_id", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "payments_registration_id_idx" ON "payments"("registration_id");

-- CreateIndex
CREATE INDEX "payments_subscription_id_idx" ON "payments"("subscription_id");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_dedupe_key_key" ON "payment_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "payment_events_payment_id_created_at_idx" ON "payment_events"("payment_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key" ON "subscriptions"("provider_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_status_idx" ON "subscriptions"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_dedupe_key_key" ON "email_logs"("dedupe_key");

-- CreateIndex
CREATE INDEX "email_logs_organization_id_created_at_idx" ON "email_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "email_logs_status_scheduled_for_idx" ON "email_logs"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "email_logs_registration_id_idx" ON "email_logs"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "automation_jobs_dedupe_key_key" ON "automation_jobs"("dedupe_key");

-- CreateIndex
CREATE INDEX "automation_jobs_status_run_at_idx" ON "automation_jobs"("status", "run_at");

-- CreateIndex
CREATE INDEX "automation_jobs_organization_id_created_at_idx" ON "automation_jobs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "job_runs_job_id_started_at_idx" ON "job_runs"("job_id", "started_at");

-- CreateIndex
CREATE INDEX "analytics_events_webinar_id_organization_id_type_created_at_idx" ON "analytics_events"("webinar_id", "organization_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_organization_id_created_at_idx" ON "analytics_events"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presenters" ADD CONSTRAINT "presenters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presenters" ADD CONSTRAINT "presenters_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webinar_sessions" ADD CONSTRAINT "webinar_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webinar_sessions" ADD CONSTRAINT "webinar_sessions_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "webinar_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "webinar_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "automation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
