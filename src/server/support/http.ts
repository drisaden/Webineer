import type { z } from "zod";
import { KB, limitOr429, readJsonBody } from "@/lib/server/http";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { AuthorizationError, requirePlatformPermission } from "@/server/auth/authorize";
import { getAppSession, getSessionUser } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";
import { getStore } from "@/server/repositories";
import { SupportError, type Agent, type Requester } from "./service";

export function noStore(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** The support desk stores tickets in the database, which demo mode doesn't have. */
export function demoModeResponse(): Response | null {
  return getStore().kind === "mock" ? noStore({ error: "The support desk needs the database, which isn't connected in demo mode." }, 503) : null;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof SupportError) return noStore({ error: error.message }, error.status);
  if (error instanceof AuthorizationError) return noStore({ error: error.message }, error.status);
  console.error("[support]", error instanceof Error ? error.message : error);
  return noStore({ error: "Something went wrong. Please try again." }, 500);
}

export async function requireCustomer(): Promise<Requester> {
  const app = await getAppSession();
  if (!app) throw new AuthorizationError("Sign in to continue.", 401);
  return { id: app.profile.id, name: app.profile.name || app.profile.email.split("@")[0], email: app.profile.email, organizationId: app.organization.id };
}

export async function requireAgent(): Promise<Agent> {
  const session = await getSessionUser();
  const db = getPrisma();
  await requirePlatformPermission(db, session, "admin.support.manage");
  const profile = await db.user.findUnique({ where: { id: session!.id }, select: { name: true, email: true } });
  return { id: session!.id, name: profile?.name || profile?.email.split("@")[0] || "Support" };
}

export async function parseWrite<S extends z.ZodType>(request: Request, schema: S, limit: { name: string; max: number; windowMs: number; subject?: string }): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  if (!isSameOriginRequest(request)) return { ok: false, response: noStore({ error: "Forbidden" }, 403) };
  const limited = await limitOr429(request, limit.name, limit.max, limit.windowMs, limit.subject);
  if (limited) return { ok: false, response: limited };
  const read = await readJsonBody(request, 16 * KB);
  if (!read.ok) return read;
  const parsed = schema.safeParse(read.data);
  if (!parsed.success) return { ok: false, response: noStore({ error: "Please check the form and try again." }, 400) };
  return { ok: true, data: parsed.data };
}
