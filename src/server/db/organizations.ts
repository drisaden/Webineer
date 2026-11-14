import type { Db } from "./prisma";

export function slugifyOrganizationName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace"
  );
}

/** Create an organization with the creator as OWNER, atomically and audited. */
export async function createOrganizationWithOwner(
  db: Db,
  owner: { id: string; email: string },
  input: { name: string; timezone?: string; currency?: "NGN" | "USD" | "EUR" | "GBP" },
) {
  const base = slugifyOrganizationName(input.name);
  return db.$transaction(async (tx) => {
    let slug = base;
    for (let n = 2; await tx.organization.findUnique({ where: { slug }, select: { id: true } }); n += 1) slug = `${base}-${n}`;
    const organization = await tx.organization.create({
      data: { name: input.name.trim(), slug, timezone: input.timezone ?? "Africa/Lagos", currency: input.currency ?? "NGN" },
    });
    await tx.membership.create({ data: { organizationId: organization.id, userId: owner.id, role: "OWNER", status: "ACTIVE" } });
    await tx.auditLog.create({
      data: { organizationId: organization.id, actorUserId: owner.id, actorEmail: owner.email, action: "organization.create", targetType: "organization", targetId: organization.id },
    });
    return organization;
  });
}
