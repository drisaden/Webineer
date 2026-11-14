import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

/**
 * Database-backed job queue (automation_jobs + job_runs). No permanent workers: a scheduler
 * (Vercel Cron / Supabase pg_cron) calls the tick endpoint, which claims due jobs with
 * FOR UPDATE SKIP LOCKED, runs them, retries failures with backoff and logs every attempt.
 */

export type JobHandler = (payload: Record<string, unknown>, ctx: { jobId: string; attempt: number }) => Promise<Record<string, unknown> | void>;

const BACKOFF_SECONDS = [60, 300, 900, 3600, 6 * 3600];
const STALE_LOCK_MS = 10 * 60 * 1000;
const JOB_TIMEOUT_MS = 45_000;

export interface EnqueueInput {
  type: string;
  payload?: Record<string, unknown>;
  runAt?: Date;
  /** Unique: the same logical job is never enqueued twice. */
  dedupeKey?: string;
  organizationId?: string | null;
  maxAttempts?: number;
}

const uuid = /^[0-9a-f-]{36}$/i;

export async function enqueueJob(input: EnqueueInput): Promise<{ status: "enqueued" | "duplicate"; id: string | null }> {
  const db = getPrisma();
  try {
    const job = await db.automationJob.create({
      data: {
        type: input.type,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
        runAt: input.runAt ?? new Date(),
        dedupeKey: input.dedupeKey?.slice(0, 300),
        organizationId: input.organizationId && uuid.test(input.organizationId) ? input.organizationId : null,
        maxAttempts: input.maxAttempts ?? 5,
      },
      select: { id: true },
    });
    return { status: "enqueued", id: job.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { status: "duplicate", id: null };
    throw error;
  }
}

type ClaimedJob = { id: string; type: string; payload: Record<string, unknown>; attempts: number; max_attempts: number };

/** Atomically claim due jobs (and jobs whose worker died mid-run). Concurrent ticks never get the same job. */
export async function claimJobs(limit: number, workerId: string): Promise<ClaimedJob[]> {
  const db = getPrisma();
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
  const now = new Date();
  // Jobs that crashed on their final attempt are failed rather than retried forever.
  await db.automationJob.updateMany({
    where: { status: "RUNNING", lockedAt: { lt: staleBefore }, attempts: { gte: db.automationJob.fields.maxAttempts } },
    data: { status: "FAILED", lastError: "Worker stopped during the final attempt.", lockedAt: null, lockedBy: null },
  });
  return db.$queryRaw<ClaimedJob[]>`
    UPDATE automation_jobs SET status = 'RUNNING', locked_at = ${now}, locked_by = ${workerId}, attempts = attempts + 1, updated_at = ${now}
    WHERE id IN (
      SELECT id FROM automation_jobs
      WHERE (status = 'PENDING' AND run_at <= ${now})
         OR (status = 'RUNNING' AND locked_at < ${staleBefore} AND attempts < max_attempts)
      ORDER BY run_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, type, payload, attempts, max_attempts`;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([p, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`Job timed out after ${ms / 1000}s`)), ms); })]);
  } finally {
    clearTimeout(timer);
  }
}

export async function runClaimedJob(job: ClaimedJob, handlers: Record<string, JobHandler>): Promise<"succeeded" | "retry" | "failed"> {
  const db = getPrisma();
  const run = await db.jobRun.create({ data: { jobId: job.id, attempt: job.attempts } });
  const handler = handlers[job.type];
  try {
    if (!handler) throw Object.assign(new Error(`No handler for job type "${job.type}"`), { permanent: true });
    const output = await withTimeout(handler(job.payload ?? {}, { jobId: job.id, attempt: job.attempts }), JOB_TIMEOUT_MS);
    await db.$transaction([
      db.jobRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", finishedAt: new Date(), output: (output ?? undefined) as Prisma.InputJsonValue | undefined } }),
      db.automationJob.update({ where: { id: job.id }, data: { status: "SUCCEEDED", completedAt: new Date(), lockedAt: null, lockedBy: null, lastError: null } }),
    ]);
    return "succeeded";
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
    const permanent = (error as { permanent?: boolean })?.permanent === true;
    const exhausted = permanent || job.attempts >= job.max_attempts;
    const delay = BACKOFF_SECONDS[Math.min(job.attempts - 1, BACKOFF_SECONDS.length - 1)] * 1000;
    await db.$transaction([
      db.jobRun.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), error: message } }),
      db.automationJob.update({
        where: { id: job.id },
        data: exhausted
          ? { status: "FAILED", lastError: message, lockedAt: null, lockedBy: null }
          : { status: "PENDING", lastError: message, runAt: new Date(Date.now() + delay), lockedAt: null, lockedBy: null },
      }),
    ]);
    console.error(`[jobs] ${job.type} ${job.id} attempt ${job.attempts} ${exhausted ? "failed permanently" : "will retry"}: ${message}`);
    return exhausted ? "failed" : "retry";
  }
}

/** Run due jobs until the time budget is used up. */
export async function runDueJobs(handlers: Record<string, JobHandler>, opts: { budgetMs?: number; batch?: number } = {}) {
  const deadline = Date.now() + (opts.budgetMs ?? 40_000);
  const workerId = `tick-${randomUUID().slice(0, 8)}`;
  const counts = { succeeded: 0, retry: 0, failed: 0 };
  while (Date.now() < deadline) {
    const jobs = await claimJobs(opts.batch ?? 20, workerId);
    if (jobs.length === 0) break;
    for (const job of jobs) {
      // Out of time: hand the rest back untouched (attempt refunded) for the next tick.
      if (Date.now() >= deadline) {
        await getPrisma().automationJob.updateMany({ where: { id: job.id, lockedBy: workerId }, data: { status: "PENDING", lockedAt: null, lockedBy: null, attempts: { decrement: 1 } } });
        continue;
      }
      counts[await runClaimedJob(job, handlers)] += 1;
    }
  }
  return counts;
}
