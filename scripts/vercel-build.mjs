// Vercel runs `npm run vercel-build` instead of `build` when this script exists.
// Production deploys apply pending database migrations first (never previews,
// so an unmerged branch can't change the live database). Without a database
// URL the migration step is skipped and the app still builds.
import { spawnSync } from "node:child_process";

const run = (cmd) => {
  const result = spawnSync(cmd, {
    shell: true,
    stdio: ["inherit", "pipe", "pipe"],
    encoding: "utf8",
    env: process.env,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status ?? "unknown"}): ${cmd}`);
  }
};

const hasDb = Boolean(process.env.DIRECT_URL || process.env.DATABASE_URL);

if (process.env.VERCEL_ENV === "production" && hasDb) {
  console.log("[vercel-build] Applying database migrations (prisma migrate deploy)…");
  run("npx prisma migrate deploy");
} else {
  console.log(`[vercel-build] Skipping migrations (${hasDb ? "not a production deploy" : "no DIRECT_URL/DATABASE_URL"}).`);
}
run("npx next build");
