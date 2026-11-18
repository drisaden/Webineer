import { createClient } from "@supabase/supabase-js";
import { limitOr429, KB, readJsonBody } from "@/lib/server/http";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { ORG_ROLE_PERMISSIONS, type OrgPermission } from "@/server/auth/permissions";
import { getAppSession, type AppSession } from "@/server/auth/session";
import { getStore } from "@/server/repositories";
import { EarningsError } from "./service";

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export function errorResponse(error: unknown): Response {
  if (error instanceof EarningsError) return json({ error: error.message }, error.status);
  console.error("[earnings]", error instanceof Error ? error.message : error);
  return json({ error: "Something went wrong. Please try again." }, 500);
}

/** Signed-in workspace member who holds the permission. Writes also need a same-origin request. */
export async function requireMember(request: Request, permission: OrgPermission, write: boolean): Promise<{ app: AppSession } | { response: Response }> {
  if (write && !isSameOriginRequest(request)) return { response: json({ error: "Forbidden" }, 403) };
  if (getStore().kind === "mock") return { response: json({ error: "Earnings need the database, which isn't connected in demo mode." }, 503) };
  const app = await getAppSession();
  if (!app) return { response: json({ error: "Sign in to continue." }, 401) };
  if (!ORG_ROLE_PERMISSIONS[app.role].includes(permission)) return { response: json({ error: "Your role can't do this." }, 403) };
  return { app };
}

export async function readBody(request: Request, subject: string, name: string, max: number, windowMs: number): Promise<{ data: Record<string, unknown> } | { response: Response }> {
  const limited = await limitOr429(request, name, max, windowMs, subject);
  if (limited) return { response: limited };
  const read = await readJsonBody(request, 8 * KB);
  if (!read.ok) return { response: read.response };
  if (!read.data || typeof read.data !== "object" || Array.isArray(read.data)) return { response: json({ error: "Please check the form and try again." }, 400) };
  return { data: read.data as Record<string, unknown> };
}

/** Re-checks the signed-in user's password without touching their session. */
export async function passwordIsCorrect(email: string, password: unknown): Promise<boolean> {
  if (typeof password !== "string" || password.length < 1 || password.length > 200) return false;
  const config = getSupabasePublicConfig();
  if (!config) return false;
  const client = createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) return false;
  await client.auth.signOut({ scope: "local" }).catch(() => undefined);
  return true;
}
