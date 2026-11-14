-- Phase 7: shared rate-limit counters (serverless instances don't share memory)
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits"("window_start");
-- Same posture as every other table: RLS without policies = no Supabase Data API access.
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
