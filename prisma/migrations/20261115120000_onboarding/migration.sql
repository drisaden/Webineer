-- First-run onboarding state. Additive and nullable: safe on a live database, no backfill needed.
-- organizations.plan_selected_at: when the owner chose a plan (Free included). NULL = show the plan chooser.
-- users.onboarding_completed_at: when the user finished or skipped the product tour. NULL = show the tour.
ALTER TABLE "organizations" ADD COLUMN "plan_selected_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" TIMESTAMPTZ(6);
