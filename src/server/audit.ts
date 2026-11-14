import { getAuthMode } from "@/lib/supabase/config";
import { getPrisma } from "@/server/db/prisma";

/** Client IP and user agent of the current request, when there is one (cron/webhooks have none of interest). */
async function requestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    return { ip: ip?.slice(0, 64) ?? null, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/** Best-effort audit entry (database mode only). Never throws into the caller. */
export async function audit(entry: {
  organizationId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (getAuthMode() === "demo") return;
  const uuid = /^[0-9a-f-]{36}$/i;
  try {
    const ctx = await requestContext();
    await getPrisma().auditLog.create({
      data: {
        organizationId: entry.organizationId && uuid.test(entry.organizationId) ? entry.organizationId : null,
        actorUserId: entry.actorUserId && uuid.test(entry.actorUserId) ? entry.actorUserId : null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: (entry.metadata ?? undefined) as never,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write", entry.action, error);
  }
}
