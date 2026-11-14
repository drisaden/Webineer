import { PrismaPg } from "@prisma/adapter-pg";
import type { PoolConfig } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Server-only Prisma client.
 *
 * Runtime traffic uses DATABASE_URL: the Supabase *pooled* connection
 * (Supavisor transaction mode, port 6543), which suits short-lived Vercel
 * functions. Migrations use DIRECT_URL via prisma.config.ts.
 *
 * TLS: set DATABASE_SSL_CA (PEM, or base64-encoded PEM) to the Supabase CA
 * certificate (Dashboard → Project Settings → Database → SSL) for verified TLS.
 *
 * Prisma connects with a privileged role and therefore BYPASSES Supabase RLS.
 * Never query tenant data without going through the authorization helpers in
 * src/server/auth/authorize.ts.
 */

function decodeCa(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("-----BEGIN")) return trimmed.replace(/\\n/g, "\n");
  return Buffer.from(trimmed, "base64").toString("utf8");
}

export function buildPoolConfig(env: Record<string, string | undefined> = process.env): PoolConfig {
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Configure the Supabase pooled connection string (see .env.example).");
  }
  const config: PoolConfig = {
    connectionString: url,
    // Small per-instance pools: each Vercel function instance holds its own pool,
    // and Supavisor multiplexes them onto real Postgres connections.
    max: Number(env.DATABASE_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  };
  if (env.DATABASE_SSL_CA) {
    // Explicit CA → full certificate verification. Remove sslmode from the URL so it can't override this.
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    config.connectionString = parsed.toString();
    config.ssl = { ca: decodeCa(env.DATABASE_SSL_CA), rejectUnauthorized: true };
  }
  return config;
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg(buildPoolConfig()),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as typeof globalThis & { __webineerPrisma?: ReturnType<typeof createPrismaClient> };

/** Lazily created so builds and pages that never touch the database don't need DATABASE_URL. */
export function getPrisma() {
  if (!globalForPrisma.__webineerPrisma) globalForPrisma.__webineerPrisma = createPrismaClient();
  return globalForPrisma.__webineerPrisma;
}

export type Db = ReturnType<typeof getPrisma>;

export function isDatabaseConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.DATABASE_URL);
}
