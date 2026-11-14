import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/server/db/prisma";

/**
 * Integration tests run against a dedicated, already-migrated Postgres
 * database given by TEST_DATABASE_URL. Its name must contain "test" so the
 * truncation below can never hit a real database.
 */
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Set TEST_DATABASE_URL to a migrated test database (name must contain 'test').");
if (!new URL(url).pathname.includes("test")) throw new Error("TEST_DATABASE_URL database name must contain 'test'.");
process.env.DATABASE_URL = url;
delete process.env.DATABASE_SSL_CA;

// getPrisma() reads DATABASE_URL lazily, so the override above takes effect.

export const db = getPrisma();

/** Supabase runs in UTC; Prisma's pg adapter sends timestamps without an offset, so tests must too. */
let tzChecked = false;
export async function resetDatabase() {
  if (!tzChecked) {
    const [{ tz }] = await db.$queryRaw<{ tz: string }[]>`SELECT current_setting('TimeZone') AS tz`;
    if (tz !== "UTC" && tz !== "Etc/UTC") throw new Error(`Test database TimeZone is ${tz}; set it to UTC (ALTER DATABASE … SET timezone = 'UTC') to match Supabase.`);
    tzChecked = true;
  }
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export async function createUser(email = `user-${randomUUID().slice(0, 8)}@example.com`, status: "ACTIVE" | "SUSPENDED" = "ACTIVE") {
  return db.user.create({ data: { id: randomUUID(), email, name: email.split("@")[0], status } });
}

export function session(user: { id: string; email: string }) {
  return { id: user.id, email: user.email };
}

export async function createWebinar(organizationId: string, slug = `webinar-${randomUUID().slice(0, 8)}`) {
  return db.webinar.create({ data: { organizationId, slug, publicId: randomUUID().replace(/-/g, "").slice(0, 16), title: "Test webinar" } });
}
