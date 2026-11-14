import { readTextBody } from "@/lib/server/http";
import { hookSecrets, planAuthEmails, verifyStandardWebhook, type HookPayload } from "@/server/email/auth-hook";
import { queueAndDeliver } from "@/server/email/outbox";
import { appUrl } from "@/server/email/receipts";
import { smtpConfig } from "@/server/email/smtp";

export const dynamic = "force-dynamic";
const MAX_BODY = 64 * 1024;

// Supabase reads { error: { http_code, message } } from a failing hook.
const fail = (status: number, message: string) => Response.json({ error: { http_code: status, message } }, { status });

/**
 * Supabase Auth Send Email Hook: confirmation, password reset, invite, magic link, email change
 * and security notices are sent through Webineer's SMTP outbox (logged, deduplicated, retried).
 * Enable in Supabase: Authentication -> Hooks -> Send Email -> HTTPS -> this URL.
 */
export async function POST(request: Request) {
  const secrets = hookSecrets();
  if (secrets.length === 0) return fail(503, "Email hook is not configured.");
  const raw = await readTextBody(request, MAX_BODY);
  if (raw === null) return fail(413, "Payload too large.");

  const verified = verifyStandardWebhook(raw, request.headers, secrets);
  if (!verified.ok) {
    console.warn("[auth-email-hook] rejected:", verified.reason);
    return fail(401, "Invalid signature.");
  }
  if (!smtpConfig()) return fail(500, "Outgoing email is not configured on the server.");

  let payload: HookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return fail(400, "Invalid JSON.");
  }
  const planned = planAuthEmails(payload, appUrl());
  if (planned.length === 0) return Response.json({});

  // Supabase aborts a hook that takes longer than ~5s, which would fail the sign-up *after* the
  // account exists. So the email is saved to the durable outbox first, the hook answers at once,
  // and delivery runs after the response; the cron runner retries any transient SMTP failure.
  for (const email of planned) {
    const result = await queueAndDeliver({
      template: `auth_${email.action}`,
      to: email.to,
      toName: email.toName,
      subject: email.subject,
      html: email.html,
      text: email.text,
      // Replayed deliveries of the same webhook can't send a second copy.
      dedupeKey: `auth:${verified.id}:${email.to.toLowerCase()}`,
    });
    if (result.status === "skipped") return fail(500, "The email could not be sent.");
  }
  return Response.json({});
}
