import { PricingError, resolveTicketPrice, type ResolvedPrice } from "@/lib/pricing/ticket";
import { randomId } from "@/lib/webinar-workflow/defaults";
import { buildPublicView, type PublicRegistrationView } from "@/lib/webinar-workflow/public-view";
import type { PublicRegistrationInput } from "@/lib/webinar-workflow/schemas";
import { nextEvergreenSession, registrationWindow } from "@/lib/webinar-workflow/sync";
import { resolveSessions } from "@/lib/webinar-workflow/time";
import { getActivePaymentProvider } from "@/providers/payment";
import { z } from "zod";
import { accessKeyFor, accessKeyMatches, assertLinkSecret } from "@/server/access-keys";
import { getStore } from "@/server/repositories";
import { confirmPayment, findTicketPayment, PaymentError, paymentsConfigured, paymentsTestMode, startReplayCheckout, startTicketCheckout } from "@/server/payments/service";
import { replayEntitled } from "@/services/attendee-access";
import { onRegistrationConfirmed, sendWorkflowEmail } from "@/services/workflow-notifications";
import type { Registration, Webinar } from "@/types";

export class RegistrationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export type RegistrationOutcome =
  | { kind: "registered"; registrationId: string; accessKey: string }
  | { kind: "already_registered" }
  | { kind: "payment_required"; registrationId: string; paymentUrl: string; testMode: boolean };

/** Hostname match supporting `*.example.com` wildcards. */
export function hostAllowed(hostname: string, allowed: string[]): boolean {
  const host = hostname.toLowerCase();
  return allowed.some((rule) => {
    const r = rule.trim().toLowerCase();
    if (r.startsWith("*.")) return host === r.slice(2) || host.endsWith(r.slice(1));
    return host === r;
  });
}

export function isEmbedOriginAllowed(webinar: Webinar, origin: string): boolean {
  const allowed = webinar.workflow?.registration.embed.allowedDomains ?? [];
  if (allowed.length === 0) return true;
  try {
    return hostAllowed(new URL(origin).hostname, allowed);
  } catch {
    return false;
  }
}

/** Public-safe lookup. Drafts never accept registrations. */
export async function getPublishedWebinarByPublicId(publicId: string): Promise<Webinar | undefined> {
  const webinar = await getStore().getWebinarByPublicId(publicId);
  if (!webinar || webinar.status === "draft") return undefined;
  return webinar;
}

export function activeRegistrationCount(webinarId: string): Promise<number> {
  return getStore().countActiveRegistrations(webinarId);
}

function resolveSessionStart(webinar: Webinar, sessionId: string, now: Date): string | undefined {
  const config = webinar.workflow!;
  if (config.configuration.mode === "schedule_later") {
    const upcoming = resolveSessions(config.schedules).filter((s) => s.status === "open" && new Date(s.startsAt) > now);
    if (upcoming.length === 0) throw new RegistrationError("There are no upcoming sessions open for registration.", 409);
    const chosen = sessionId ? upcoming.find((s) => s.id === sessionId) : upcoming[0];
    if (!chosen) throw new RegistrationError("The selected session is no longer available.", 409, { sessionId: "Choose another session." });
    return chosen.startsAt;
  }
  if (config.configuration.mode === "always_on") return (nextEvergreenSession(config, now) ?? now).toISOString();
  return config.publishedAt;
}

/** What a visitor would pay for their ticket choice and code. Used by the form's "Apply" button. */
export async function quoteTicket(publicId: string, tierId: string, code: string) {
  const webinar = await getPublishedWebinarByPublicId(publicId);
  if (!webinar || !webinar.workflow) throw new RegistrationError("This webinar is not accepting registrations.", 404);
  const pay = webinar.workflow.integrations.payment;
  const regs = pay.enabled ? await getStore().listRegistrations(webinar.id) : [];
  const usedBy = (c: string) => regs.filter((r) => r.status !== "cancelled" && r.metadata?.discountCode === c).length;
  try {
    const price = resolveTicketPrice(pay, { tierId, code }, usedBy);
    return { amount: price.amount, base: price.base, discount: price.discount, currency: price.currency, code: price.code };
  } catch (error) {
    if (error instanceof PricingError) throw new RegistrationError(error.message, 422, { [error.field === "tier" ? "tierId" : "discountCode"]: error.message });
    throw error;
  }
}

/**
 * Single registration backend used by the hosted page, inline embed, popup
 * embed and registration button. All validation happens here, server-side.
 */
export async function registerAttendee(
  input: PublicRegistrationInput,
  meta: { origin: string; now?: Date },
): Promise<RegistrationOutcome> {
  const now = meta.now ?? new Date();
  const webinar = await getPublishedWebinarByPublicId(input.publicId);
  if (!webinar || !webinar.workflow) throw new RegistrationError("This webinar is not accepting registrations.", 404);
  const config = webinar.workflow;
  const store = getStore();
  assertLinkSecret();

  await store.recordEvent({ workspaceId: webinar.workspaceId, webinarId: webinar.id, eventType: "registration_started", source: input.source });

  if (input.website) throw new RegistrationError("Your submission could not be accepted.", 400);
  if (input.renderedAt && now.getTime() - input.renderedAt < 1500) {
    throw new RegistrationError("That was fast! Please wait a moment and submit again.", 429);
  }
  if ((input.source === "inline" || input.source === "popup") && !isEmbedOriginAllowed(webinar, input.embedOrigin)) {
    throw new RegistrationError("Registration is not enabled on this website.", 403);
  }

  const window = registrationWindow(webinar, now);
  if (!window.open) throw new RegistrationError(window.reason ?? "Registration is closed.", 409);

  // Field validation driven by the stored configuration, never by the client.
  const fieldErrors: Record<string, string> = {};
  const phone = input.phone.trim();
  if (config.registration.phoneField === "required" && !phone) fieldErrors.phone = "Phone number is required.";
  if (phone && !/^[+()\d\s-]{6,40}$/.test(phone)) fieldErrors.phone = "Enter a valid phone number.";
  const answers: Record<string, string | boolean> = {};
  for (const q of config.registration.customQuestions) {
    const raw = input.answers[q.id];
    if (q.type === "checkbox") {
      const checked = raw === true || raw === "true";
      if (q.required && !checked) fieldErrors[`q_${q.id}`] = "This box must be checked.";
      answers[q.id] = checked;
      continue;
    }
    const value = typeof raw === "string" ? raw.trim() : "";
    if (q.required && !value) fieldErrors[`q_${q.id}`] = "This field is required.";
    if (value && q.type === "select" && !q.options.includes(value)) fieldErrors[`q_${q.id}`] = "Choose one of the listed options.";
    if (value) answers[q.id] = value.slice(0, q.type === "textarea" ? 2000 : 300);
  }
  if (Object.keys(fieldErrors).length > 0) throw new RegistrationError("Please fix the highlighted fields.", 422, fieldErrors);

  const sessionStartsAt = resolveSessionStart(webinar, input.sessionId, now);

  // One registration per email per webinar. We never return the existing
  // registration's access key here; the owner of the address gets a fresh
  // confirmation email instead.
  const dbPayments = store.kind !== "mock";
  // The price comes from the host's saved settings and the visitor's choices, never from the browser.
  const existingRegs = config.integrations.payment.enabled ? await store.listRegistrations(webinar.id) : [];
  const usedBy = (code: string) => existingRegs.filter((r) => r.status !== "cancelled" && r.metadata?.discountCode === code && r.email.toLowerCase() !== input.email.toLowerCase()).length;
  let price: ResolvedPrice;
  try {
    price = resolveTicketPrice(config.integrations.payment, { tierId: input.tierId, code: input.discountCode }, usedBy, now);
  } catch (error) {
    if (error instanceof PricingError) throw new RegistrationError(error.message, 422, { [error.field === "tier" ? "tierId" : "discountCode"]: error.message });
    throw error;
  }
  const paid = price.amount > 0;
  const priceMeta = { ticketTier: price.tier?.name, ticketTierId: price.tier?.id, discountCode: price.code ?? undefined, discountAmount: price.discount || undefined, listPrice: price.base };
  if (paid && dbPayments && !paymentsConfigured()) {
    throw new RegistrationError("Ticket sales for this webinar aren't available right now. Please try again later.", 503);
  }

  const alreadyRegistered = async (): Promise<RegistrationOutcome> => {
    const existing = await store.findRegistrationByEmail(webinar.id, input.email);
    // An unpaid ticket (abandoned or failed checkout) can be resumed instead of being stuck.
    if (existing && paid && dbPayments && (existing.paymentStatus === "pending" || existing.paymentStatus === "failed")) {
      // A stale unpaid registration no longer holds a seat; re-check capacity before resuming.
      const stale = existing.paymentStatus === "failed" || now.getTime() - Date.parse(existing.registeredAt) > 30 * 60 * 1000;
      if (stale && config.registration.capacity != null && (await store.countActiveRegistrations(webinar.id)) >= config.registration.capacity) {
        throw new RegistrationError("This webinar is full.", 409);
      }
      const resumed = stale ? ((await store.updateRegistration(existing.id, { registeredAt: now.toISOString(), paymentStatus: "pending" })) ?? existing) : existing;
      // They may have picked another ticket or code this time, so the checkout uses what they chose now.
      return beginTicketPayment({ ...resumed, metadata: { ...resumed.metadata, ...priceMeta } }, input.source);
    }
    if (existing && existing.paymentStatus !== "pending" && existing.paymentStatus !== "failed") {
      // Re-send the confirmation to the address owner, at most once an hour (no inbox flooding).
      const hour = Math.floor(now.getTime() / 3_600_000);
      await sendWorkflowEmail(webinar, existing, config.notifications.confirmation, "registration_confirmation", meta.origin, `confirm-resend:${existing.id}:${hour}`);
    }
    return { kind: "already_registered" as const };
  };

  const beginTicketPayment = async (registration: Registration, source: Registration["source"]): Promise<RegistrationOutcome> => {
    try {
      const checkout = await startTicketCheckout({
        organizationId: webinar.workspaceId,
        webinarId: webinar.id,
        webinarTitle: webinar.title,
        registrationId: registration.id,
        email: registration.email,
        name: registration.name,
        amount: price.amount,
        currency: price.currency,
        origin: meta.origin,
      });
      await store.updateRegistration(registration.id, {
        paymentStatus: "pending",
        transactionId: checkout.txRef,
        metadata: { ...registration.metadata, paymentProvider: "flutterwave", paymentAmount: price.amount, paymentCurrency: price.currency },
      });
      await store.recordEvent({ workspaceId: webinar.workspaceId, webinarId: webinar.id, eventType: "payment_initiated", source, registrationId: registration.id });
      return { kind: "payment_required", registrationId: registration.id, paymentUrl: checkout.checkoutUrl, testMode: paymentsTestMode() };
    } catch (error) {
      if (error instanceof PaymentError) throw new RegistrationError(error.message, error.status);
      throw error;
    }
  };

  if (await store.findRegistrationByEmail(webinar.id, input.email)) return alreadyRegistered();

  const draft: Omit<Registration, "id"> = {
    webinarId: webinar.id,
    name: input.name,
    email: input.email,
    registeredAt: now.toISOString(),
    source: input.source,
    status: "registered",
    paymentStatus: paid ? "pending" : "free",
    selectedSessionSlot: sessionStartsAt,
    metadata: {
      // Demo mode only; database mode derives keys with HMAC and never stores them.
      accessKey: randomId("", 24),
      phone: phone || undefined,
      answers,
      sessionStartsAt,
      embedOrigin: input.embedOrigin || undefined,
      ...priceMeta,
    },
  };
  // Capacity and duplicate checks happen atomically inside the store.
  const created = await store.createRegistration(draft, { capacity: config.registration.capacity });
  if (created.status !== "created") {
    if (created.status === "duplicate") return alreadyRegistered();
    throw new RegistrationError("This webinar is full.", 409);
  }
  const registration = created.registration;
  const accessKey = accessKeyFor(registration);

  // A limited code can be used up by someone registering at the same moment. Count again now that this
  // registration exists, and give the seat back if the code has gone over its limit.
  if (price.code) {
    const limit = config.integrations.payment.discountCodes?.find((c) => c.code === price.code)?.maxUses;
    if (limit != null) {
      const now2 = (await store.listRegistrations(webinar.id)).filter((r) => r.status !== "cancelled" && r.metadata?.discountCode === price.code).sort((a, b) => a.registeredAt.localeCompare(b.registeredAt) || a.id.localeCompare(b.id));
      if (now2.findIndex((r) => r.id === registration.id) >= limit) {
        await store.updateRegistration(registration.id, { status: "cancelled" });
        throw new RegistrationError("That code isn't valid.", 422, { discountCode: "That code isn't valid." });
      }
    }
  }

  if (paid && dbPayments) {
    try {
      return await beginTicketPayment(registration, input.source);
    } catch (error) {
      // Don't hold a seat for a checkout that never started.
      await store.updateRegistration(registration.id, { status: "cancelled" });
      throw error;
    }
  }

  if (paid) {
    // Demo mode only: simulated gateway, no money moves.
    const provider = getActivePaymentProvider();
    const init = await provider.initialize({
      transactionId: randomId("tx", 12),
      email: registration.email,
      name: registration.name,
      amount: price.amount,
      currency: price.currency,
      webinarId: webinar.id,
      ticketTypeId: `workflow_${webinar.id}`,
      callbackUrl: `${meta.origin}/api/public/payments/verify/${registration.id}`,
    });
    if (!init.success || !init.authorizationUrl) {
      await store.updateRegistration(registration.id, { status: "cancelled" });
      throw new RegistrationError(init.errorMessage ?? "Payment could not be started. Please try again.", 502);
    }
    await store.updateRegistration(registration.id, {
      transactionId: init.reference,
      metadata: { ...registration.metadata, paymentProvider: init.provider, paymentAmount: price.amount, paymentCurrency: price.currency },
    });
    await store.recordEvent({ workspaceId: webinar.workspaceId, webinarId: webinar.id, eventType: "payment_initiated", source: input.source, registrationId: registration.id });
    return { kind: "payment_required", registrationId: registration.id, paymentUrl: init.authorizationUrl, testMode: init.provider === "simulated" };
  }

  await store.recordEvent({ workspaceId: webinar.workspaceId, webinarId: webinar.id, eventType: "registration_completed", source: input.source, registrationId: registration.id });
  await onRegistrationConfirmed(webinar, registration, meta.origin);
  return { kind: "registered", registrationId: registration.id, accessKey };
}

/**
 * Gateway return / webhook fulfilment. In database mode the Flutterwave transaction is verified
 * server-side (amount, currency, status, tx_ref) and value is granted exactly once; query
 * parameters from the browser are only lookup hints.
 */
export async function verifyRegistrationPayment(
  registrationId: string,
  origin: string,
  hints: { txRef?: string | null; transactionId?: string | null } = {},
): Promise<{ ok: boolean; pending?: boolean; registration?: Registration; webinar?: Webinar }> {
  const store = getStore();
  const registration = await store.getRegistration(registrationId);
  if (!registration) return { ok: false };
  const webinar = await store.getWebinar(registration.webinarId);
  if (!webinar) return { ok: false };
  if (registration.paymentStatus === "paid") return { ok: true, registration, webinar };

  if (store.kind !== "mock") {
    const payment = await findTicketPayment(registration.id, hints.txRef);
    if (!payment) return { ok: false, registration, webinar };
    const result = await confirmPayment({ txRef: payment.txRef, transactionId: hints.transactionId, source: "redirect" });
    if (result.newlyCompleted) return { ok: true, registration: await fulfilTicket(webinar, registration.id, origin), webinar };
    if (result.outcome === "successful") return { ok: true, registration: (await store.getRegistration(registration.id))!, webinar };
    return { ok: false, pending: result.outcome === "pending", registration, webinar };
  }

  // Demo mode: simulated gateway.
  if (!registration.transactionId) return { ok: false };
  const provider = getActivePaymentProvider();
  const result = await provider.verify(registration.transactionId);
  const expectedAmount = Number(registration.metadata?.paymentAmount ?? 0);
  const expectedCurrency = String(registration.metadata?.paymentCurrency ?? "");
  const amountOk = result.amount >= expectedAmount;
  const currencyOk = !expectedCurrency || !result.currency || result.currency.toUpperCase() === expectedCurrency.toUpperCase();

  if (!result.success || result.status !== "completed" || !amountOk || !currencyOk) {
    await store.updateRegistration(registration.id, {
      metadata: { ...registration.metadata, paymentError: result.errorMessage ?? "Payment could not be verified." },
    });
    return { ok: false, registration, webinar };
  }

  await store.updateRegistration(registration.id, { paymentStatus: "paid", metadata: { ...registration.metadata, paidAt: new Date().toISOString() } });
  return { ok: true, registration: await fulfilTicket(webinar, registration.id, origin), webinar };
}

/** Post-payment side effects (analytics + confirmation email). Called once per completed ticket. */
export async function fulfilTicket(webinar: Webinar, registrationId: string, origin: string): Promise<Registration> {
  const store = getStore();
  const registration = (await store.getRegistration(registrationId))!;
  // A replay purchase completes through the same payment path but must not send a ticket confirmation.
  if (registration.paymentStatus !== "paid") return registration;
  await store.recordEvent({ workspaceId: webinar.workspaceId, webinarId: webinar.id, eventType: "payment_completed", source: registration.source, registrationId: registration.id });
  await store.recordEvent({ workspaceId: webinar.workspaceId, webinarId: webinar.id, eventType: "registration_completed", source: registration.source, registrationId: registration.id });
  await onRegistrationConfirmed(webinar, registration, origin);
  return registration;
}

/** Validate a personal access link (room/replay/thank-you). */
export async function verifyAccess(webinar: Webinar, registrationId?: string | null, accessKey?: string | null): Promise<Registration | null> {
  if (!registrationId || !accessKey) return null;
  const registration = await getStore().getRegistration(registrationId);
  if (!registration || registration.webinarId !== webinar.id || registration.status === "cancelled") return null;
  return accessKeyMatches(registration, accessKey) ? registration : null;
}

/** Public-safe view model for registration pages and embeds. */
export async function publicViewFor(webinar: Webinar): Promise<PublicRegistrationView> {
  return buildPublicView(webinar, {
    activeRegistrations: await activeRegistrationCount(webinar.id),
    paymentTestMode: getStore().kind === "mock" ? true : paymentsTestMode(),
  });
}


const replayBuyerSchema = z.object({ name: z.string().trim().min(2, "Enter your name").max(120), email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200) });

export type ReplayPurchaseOutcome =
  | { kind: "payment_required"; paymentUrl: string; testMode: boolean }
  | { kind: "already_access"; registrationId: string; accessKey: string };

/**
 * Start buying a replay. A registrant identifies with their personal link (r and k). Anyone else gives a
 * name and email, which creates a registration for the webinar (replay-only; no live ticket is implied).
 */
export async function startReplayPurchase(input: { slug: string; r?: string; k?: string; name?: string; email?: string }, origin: string): Promise<ReplayPurchaseOutcome> {
  const store = getStore();
  if (store.kind === "mock") throw new RegistrationError("Selling replays needs the live database and payments, so it isn't available in demo mode.", 503);
  assertLinkSecret();
  const webinar = await store.getWebinarBySlug(input.slug);
  if (!webinar?.workflow || webinar.status === "draft") throw new RegistrationError("This replay isn't available.", 404);
  const config = webinar.workflow;
  const sales = config.replay.enabled ? config.replay.sales : undefined;
  if (!sales?.enabled || !(sales.price > 0)) throw new RegistrationError("This replay isn't for sale.", 404);
  if (!paymentsConfigured()) throw new RegistrationError("Online payments aren't available right now. Please try again later.", 503);

  let registration = await verifyAccess(webinar, input.r, input.k);
  if (!registration) {
    const parsed = replayBuyerSchema.safeParse({ name: input.name, email: input.email });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ||= issue.message;
      throw new RegistrationError("Enter your name and email to continue.", 422, fieldErrors);
    }
    if (await store.findRegistrationByEmail(webinar.id, parsed.data.email)) {
      throw new RegistrationError("This email is already registered. Open your personal link from your email to buy the replay.", 409);
    }
    const created = await store.createRegistration({
      webinarId: webinar.id,
      name: parsed.data.name,
      email: parsed.data.email,
      registeredAt: new Date().toISOString(),
      source: "direct",
      status: "registered",
      paymentStatus: config.integrations.payment.enabled ? "pending" : "free",
      metadata: { replayOnly: true },
    }, {});
    if (created.status !== "created") throw new RegistrationError("This email is already registered. Open your personal link from your email to buy the replay.", 409);
    registration = created.registration;
  }

  if (replayEntitled(config, registration)) return { kind: "already_access", registrationId: registration.id, accessKey: accessKeyFor(registration) };

  try {
    const checkout = await startReplayCheckout({
      organizationId: webinar.workspaceId,
      webinarId: webinar.id,
      webinarTitle: webinar.title,
      registrationId: registration.id,
      email: registration.email,
      name: registration.name,
      amount: sales.price,
      currency: sales.currency,
      origin,
    });
    return { kind: "payment_required", paymentUrl: checkout.checkoutUrl, testMode: paymentsTestMode() };
  } catch (error) {
    if (error instanceof PaymentError) throw new RegistrationError(error.message, error.status);
    throw error;
  }
}
