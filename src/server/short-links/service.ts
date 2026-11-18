import { getPrisma } from "@/server/db/prisma";
import { generateCode, isValidCode, shortUrl } from "@/lib/short-links/code";

export class ShortLinkError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** The webinar's short link, created on first use. Safe to call repeatedly and concurrently. */
export async function getOrCreateShortLink(organizationId: string, webinarId: string): Promise<{ code: string; url: string; clicks: number }> {
  const db = getPrisma();
  const webinar = await db.webinar.findFirst({ where: { id: webinarId, organizationId, deletedAt: null }, select: { id: true, slug: true } });
  if (!webinar) throw new ShortLinkError("Webinar not found.", 404);
  const existing = await db.shortLink.findUnique({ where: { webinarId } });
  if (existing) return { code: existing.code, url: shortUrl(existing.code), clicks: existing.clicks };
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const created = await db.shortLink.create({ data: { code: generateCode(), organizationId, webinarId } });
      return { code: created.code, url: shortUrl(created.code), clicks: 0 };
    } catch (error) {
      // Unique violation: another request made this webinar's link first, or the random code collided.
      const raced = await db.shortLink.findUnique({ where: { webinarId } });
      if (raced) return { code: raced.code, url: shortUrl(raced.code), clicks: raced.clicks };
      if (!(error instanceof Error) || !/unique/i.test(error.message)) throw error;
    }
  }
  throw new ShortLinkError("Could not create a short link. Please try again.", 500);
}

export async function shortLinkFor(organizationId: string, webinarId: string): Promise<{ code: string; url: string; clicks: number } | null> {
  const row = await getPrisma().shortLink.findFirst({ where: { webinarId, organizationId } });
  return row ? { code: row.code, url: shortUrl(row.code), clicks: row.clicks } : null;
}

/** Where a short code leads, or null when it is unknown. Counts the visit. */
export async function resolveShortLink(code: string): Promise<{ slug: string; published: boolean } | null> {
  if (!isValidCode(code)) return null;
  const db = getPrisma();
  const link = await db.shortLink.findUnique({ where: { code }, include: { webinar: { select: { slug: true, status: true, deletedAt: true } } } });
  if (!link || link.webinar.deletedAt) return null;
  // Counting must never slow down or break the redirect.
  void db.shortLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 }, lastClickedAt: new Date() } }).catch(() => undefined);
  return { slug: link.webinar.slug, published: link.webinar.status !== "DRAFT" };
}
