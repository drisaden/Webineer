import fs from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 does not load .env files itself. Load the same files Next.js uses,
// without overriding variables already set (e.g. by Vercel).
for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

// Migrations and introspection use the DIRECT (non-pooled) connection.
// The application runtime uses the pooled DATABASE_URL (src/server/db/prisma.ts).
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Omitted when no URL is configured so `prisma generate` works in CI/installs.
  ...(migrationUrl
    ? {
        datasource: {
          url: migrationUrl,
          ...(process.env.SHADOW_DATABASE_URL ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL } : {}),
        },
      }
    : {}),
});
