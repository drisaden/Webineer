/**
 * Local development seed. Creates a demo organization owned by an existing
 * user profile. It never creates auth credentials: sign up through Supabase
 * Auth first, then run `SEED_OWNER_EMAIL=you@example.com npm run db:seed`.
 */
import { getPrisma } from "../src/server/db/prisma";
import { createOrganizationWithOwner } from "../src/server/db/organizations";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("Refusing to seed a production database. Set ALLOW_PRODUCTION_SEED=true if you really mean it.");
  }
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.log("SEED_OWNER_EMAIL not set — nothing to seed.");
    return;
  }
  const db = getPrisma();
  const owner = await db.user.findUnique({ where: { email } });
  if (!owner) throw new Error(`No user profile for ${email}. Sign up first so the profile exists.`);
  const existing = await db.membership.findFirst({ where: { userId: owner.id, role: "OWNER" } });
  if (existing) {
    console.log("Owner already has an organization; skipping.");
    return;
  }
  const org = await createOrganizationWithOwner(db, owner, { name: `${owner.name || "Demo"} Workspace` });
  console.log(`Created organization ${org.slug}`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
