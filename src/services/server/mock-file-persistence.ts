import fs from "node:fs";
import path from "node:path";
import {
  hydrateMockStore,
  setMockPersistenceAdapter,
  type MockStoreSnapshot,
} from "@/services/mock-webinar-repository";

/**
 * Local-development persistence for the mock repository.
 *
 * Writes webinars and registrations to `.webineer-data/mock-store.json` so
 * drafts survive dev-server restarts. It is disabled on Vercel/serverless
 * (read-only file system) and when WEBINEER_MOCK_PERSISTENCE=memory. It is a
 * stand-in for the planned Supabase PostgreSQL + Prisma repository, not a
 * production database.
 */
export function registerMockFilePersistence() {
  if (process.env.VERCEL || process.env.WEBINEER_MOCK_PERSISTENCE === "memory") return;

  const dir = path.join(process.cwd(), ".webineer-data");
  const file = path.join(dir, "mock-store.json");

  try {
    if (fs.existsSync(file)) {
      const snapshot = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<MockStoreSnapshot>;
      hydrateMockStore(snapshot);
    }
  } catch (error) {
    console.warn("[webineer] Could not load mock store snapshot:", error);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  setMockPersistenceAdapter({
    save(snapshot) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          fs.mkdirSync(dir, { recursive: true });
          const tmp = `${file}.tmp`;
          fs.writeFileSync(tmp, JSON.stringify(snapshot));
          fs.renameSync(tmp, file);
        } catch (error) {
          console.warn("[webineer] Could not persist mock store:", error);
        }
      }, 150);
    },
  });
}
