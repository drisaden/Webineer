"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { originFromHeaders } from "@/lib/server/request-origin";
import { getAuthMode, safeNextPath } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultOrganization, isPlanKey, syncUserProfile } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";

export interface AuthFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Echo of the email so the form keeps it after an error. */
  email?: string;
  /** Non-secret field values echoed back so React's post-action form reset keeps them. Never passwords. */
  values?: Record<string, string>;
}

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(200);
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use letters and at least one number.");

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

async function clientKey() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function audit(action: string, actor: { id?: string; email?: string }, metadata?: Record<string, unknown>) {
  try {
    const h = await headers();
    await getPrisma().auditLog.create({
      data: {
        action,
        actorUserId: actor.id ?? null,
        actorEmail: actor.email ?? null,
        ipAddress: h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
        metadata: metadata as never,
      },
    });
  } catch (error) {
    console.error("[auth] audit log failed", error);
  }
}

function notConfigured(): AuthFormState {
  return { status: "error", message: "Sign-in isn't configured on this server yet. Ask the administrator to set up Supabase Auth." };
}

// ---------------------------------------------------------------------------

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const mode = getAuthMode();
  if (mode === "demo") redirect(next);
  if (mode !== "supabase") return notConfigured();

  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.").max(200) }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), email: String(formData.get("email") ?? "") };

  const ip = await clientKey();
  const limits = await Promise.all([checkRateLimit(`login:ip:${ip}`, 20, 10 * 60_000), checkRateLimit(`login:email:${parsed.data.email}`, 8, 15 * 60_000)]);
  if (limits.some((l) => !l.allowed)) {
    return { status: "error", message: "Too many sign-in attempts. Please wait a few minutes and try again.", email: parsed.data.email };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      // The password was right but the address is unconfirmed. Earlier links may have expired, so send a
      // fresh one (bounded) instead of only claiming that one was sent.
      let resent = false;
      if ((await checkRateLimit(`resend-confirm:${parsed.data.email}`, 3, 15 * 60_000)).allowed) {
        const origin = await originFromHeaders();
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email: parsed.data.email,
          options: { emailRedirectTo: `${origin}/auth/confirm?next=/dashboard` },
        });
        if (resendError) console.error("[auth] resend confirmation failed", resendError.code, resendError.message);
        resent = !resendError;
      }
      return {
        status: "error",
        message: resent
          ? "Please confirm your email address first. We've just sent you a new confirmation link. Use the most recent email; older links no longer work."
          : "Please confirm your email address first, using the most recent confirmation email we sent you.",
        email: parsed.data.email,
      };
    }
    await audit("auth.sign_in_failed", { email: parsed.data.email });
    return { status: "error", message: "Incorrect email or password.", email: parsed.data.email };
  }

  try {
    const db = getPrisma();
    const { profile, workspaceName, planPreselected } = await syncUserProfile(db, data.user);
    if (profile.status !== "ACTIVE") {
      await supabase.auth.signOut();
      return { status: "error", message: "This account has been suspended. Contact support for help." };
    }
    await ensureDefaultOrganization(db, { id: profile.id, email: profile.email, name: profile.name }, workspaceName, planPreselected);
    await audit("auth.sign_in", { id: profile.id, email: profile.email });
  } catch (err) {
    console.error("[auth] profile sync failed", err);
    await supabase.auth.signOut();
    return { status: "error", message: "We couldn't load your account. Please try again or contact support." };
  }
  redirect(next);
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const mode = getAuthMode();
  if (mode === "demo") redirect("/dashboard");
  if (mode !== "supabase") return notConfigured();

  const parsed = z
    .object({
      firstName: z.string().trim().min(1, "Enter your first name.").max(60),
      lastName: z.string().trim().max(60),
      email,
      workspaceName: z.string().trim().min(2, "Enter a workspace name.").max(80),
      password,
      confirmPassword: z.string(),
    })
    .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match." })
    .safeParse(Object.fromEntries(["firstName", "lastName", "email", "workspaceName", "password", "confirmPassword"].map((k) => [k, formData.get(k) ?? ""])));
  const values = Object.fromEntries(["firstName", "lastName", "email", "workspaceName"].map((k) => [k, String(formData.get(k) ?? "").slice(0, 200)]));
  // A plan picked on the pricing section before signing up (optional).
  const planChoice = formData.get("plan");
  const selectedPlan = isPlanKey(planChoice) ? planChoice : null;
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), email: values.email, values };

  const ip = await clientKey();
  if (!(await checkRateLimit(`signup:ip:${ip}`, 5, 60 * 60_000)).allowed) {
    return { status: "error", message: "Too many sign-up attempts from this network. Please try again later.", values };
  }

  const { firstName, lastName, workspaceName } = parsed.data;
  const origin = await originFromHeaders();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // With a paid plan already chosen, land on Billing to complete it; otherwise the dashboard.
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(selectedPlan && selectedPlan !== "free" ? `/dashboard/billing?plan=${selectedPlan}` : "/dashboard")}`,
      // Display data only. Authorization never reads user_metadata.
      data: { full_name: `${firstName} ${lastName}`.trim(), workspace_name: workspaceName, ...(selectedPlan ? { selected_plan: selectedPlan } : {}) },
    },
  });
  if (error) {
    if (error.code === "weak_password") return { status: "error", fieldErrors: { password: error.message }, email: parsed.data.email, values };
    if (error.status === 429) return { status: "error", message: "Too many requests. Please try again in a little while.", values };
    console.error("[auth] sign-up failed", error.code, error.message);
    return { status: "error", message: "We couldn't create your account. Please try again.", email: parsed.data.email, values };
  }

  // The app profile row (audit_logs.actor_user_id FK target) is created on first sign-in, so it
  // doesn't exist yet. Record the auth user id in metadata instead of violating the foreign key.
  await audit("auth.sign_up", { email: parsed.data.email }, { authUserId: data.user?.id ?? null });

  // Email confirmation disabled in Supabase → a session is returned immediately.
  if (data.session && data.user) {
    const db = getPrisma();
    const { profile } = await syncUserProfile(db, data.user);
    await ensureDefaultOrganization(db, { id: profile.id, email: profile.email, name: profile.name }, workspaceName, Boolean(selectedPlan));
    redirect("/dashboard");
  }
  // Same response whether or not the email was already registered (no account enumeration).
  return { status: "success", message: `Check ${parsed.data.email} for a confirmation link to activate your account.` };
}

export async function requestPasswordResetAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const mode = getAuthMode();
  if (mode === "demo") return { status: "success", message: "Demo mode: no email is sent." };
  if (mode !== "supabase") return notConfigured();

  const parsed = z.object({ email }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), email: String(formData.get("email") ?? "") };

  const ip = await clientKey();
  const generic: AuthFormState = { status: "success", message: "If an account exists for that email, a password reset link is on its way." };
  if (!(await checkRateLimit(`reset:ip:${ip}`, 5, 15 * 60_000)).allowed || !(await checkRateLimit(`reset:email:${parsed.data.email}`, 3, 15 * 60_000)).allowed) {
    return generic;
  }

  const origin = await originFromHeaders();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });
  if (error) console.error("[auth] reset request failed", error.code, error.message);
  await audit("auth.password_reset_requested", { email: parsed.data.email });
  return generic;
}

export async function updatePasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (getAuthMode() !== "supabase") return notConfigured();
  const parsed = z
    .object({ password, confirmPassword: z.string() })
    .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match." })
    .safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return { status: "error", message: "Your reset link has expired. Request a new one." };
  }
  const { data, error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { status: "error", fieldErrors: { password: "Choose a password you haven't used before." } };
    if (error.code === "weak_password") return { status: "error", fieldErrors: { password: error.message } };
    return { status: "error", message: "We couldn't update your password. Request a new reset link and try again." };
  }
  await audit("auth.password_updated", { id: data.user?.id, email: data.user?.email });
  redirect("/dashboard?password=updated");
}
