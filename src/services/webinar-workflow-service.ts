import { workspace } from "@/data/mock/users";
import { canManageWebinar } from "@/lib/auth/demo-session";
import type { OrgPermission } from "@/server/auth/permissions";
import { audit } from "@/server/audit";
import { getPrisma } from "@/server/db/prisma";
import { ConcurrencyError, getStore } from "@/server/repositories";
import { getEffectivePlan, paymentsConfigured, paymentsTestMode } from "@/server/payments/service";
import { SAAS_PLANS } from "@/services/billing-entitlements";
import { createDefaultWorkflowConfig, DATA_SECTION_KEYS, randomId, slugify } from "@/lib/webinar-workflow/defaults";
import { applyWorkflowToWebinar } from "@/lib/webinar-workflow/sync";
import { evaluateWorkflow } from "@/lib/webinar-workflow/validation";
import { getEmailProvider } from "@/providers/email";
import type {
  RegistrationAnalyticsSummary,
  User,
  Webinar,
  WebinarWorkflowConfig,
  WorkflowDataSectionKey,
  WorkflowEvaluation,
  WorkflowSectionData,
} from "@/types";

export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export interface PaymentAvailability {
  provider: "flutterwave" | "simulated";
  /** True when real payments can be taken: Flutterwave configured and not demo mode. */
  live: boolean;
  /** Flutterwave sandbox key (no real money moves). */
  testMode: boolean;
  /** Database mode without gateway keys: paid webinars can't be published. */
  unavailable: boolean;
}

/** Report which gateway is active without exposing any key material. */
export function getPaymentAvailability(): PaymentAvailability {
  if (getStore().kind === "mock") return { provider: "simulated", live: false, testMode: true, unavailable: false };
  if (!paymentsConfigured()) return { provider: "flutterwave", live: false, testMode: true, unavailable: true };
  const testMode = paymentsTestMode();
  return { provider: "flutterwave", live: !testMode, testMode, unavailable: false };
}

export interface WorkflowPayload {
  webinar: Pick<Webinar, "id" | "slug" | "status" | "title" | "registrationCount" | "createdAt" | "updatedAt">;
  config: WebinarWorkflowConfig;
  evaluation: WorkflowEvaluation;
  analytics: RegistrationAnalyticsSummary;
}

export async function toWorkflowPayload(webinar: Webinar): Promise<WorkflowPayload> {
  const config = webinar.workflow!;
  const store = getStore();
  const [registrationCount, analytics] = await Promise.all([store.countActiveRegistrations(webinar.id), store.getRegistrationFunnel(webinar.id)]);
  return {
    webinar: {
      id: webinar.id,
      slug: webinar.slug,
      status: webinar.status,
      title: webinar.title,
      registrationCount,
      createdAt: webinar.createdAt,
      updatedAt: webinar.updatedAt,
    },
    config,
    evaluation: evaluateWorkflow(config, { published: webinar.status !== "draft" }),
    analytics,
  };
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "webinar";
  let candidate = root;
  let n = 2;
  while (await getStore().isSlugTaken(candidate, excludeId)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

/**
 * Load a webinar the user may manage. Workspace isolation is enforced here so a
 * mutated URL id can never reach another tenant's webinar.
 */
export async function getOwnedWebinar(user: User, id: string, permission: OrgPermission = "webinar.edit"): Promise<Webinar> {
  const webinar = await getStore().getWebinar(id);
  if (!webinar || webinar.workspaceId !== user.workspaceId) throw new WorkflowError("Webinar not found.", 404);
  if (!canManageWebinar(user, webinar, permission)) throw new WorkflowError("You don't have permission to do that.", 403);
  return webinar;
}

/** Persist through the store, translating optimistic-concurrency failures to 409. */
async function persist(webinar: Webinar, expectedVersion?: number): Promise<Webinar> {
  try {
    return await getStore().updateWebinar(webinar, { expectedVersion });
  } catch (error) {
    if (error instanceof ConcurrencyError) throw new WorkflowError(error.message, 409, { conflicts: ["webinar"] });
    throw error;
  }
}

export async function organizationTimezone(workspaceId: string): Promise<string> {
  if (getStore().kind === "mock") return workspace.timezone;
  const org = await getPrisma().organization.findUnique({ where: { id: workspaceId }, select: { timezone: true } });
  return org?.timezone ?? "UTC";
}

/**
 * Existing webinars created before the workflow existed get a workflow
 * configuration derived from their current fields the first time they are
 * opened in the editor, so nothing is lost.
 */
export async function ensureWorkflow(user: User, webinar: Webinar): Promise<Webinar> {
  if (webinar.workflow) return webinar;
  const config = createDefaultWorkflowConfig({ hostName: user.name, hostEmail: user.email, timezone: webinar.schedule.timezone || workspace.timezone });
  config.configuration.title = webinar.title;
  config.configuration.description = webinar.description;
  config.configuration.category = "";
  config.configuration.mode = webinar.type === "evergreen" || webinar.type === "on_demand" || webinar.type === "automated" ? "always_on" : "schedule_later";
  config.integrations.video = { ...config.integrations.video, provider: webinar.videoSource.provider, url: webinar.videoSource.url };
  config.registration.headline = webinar.title;
  config.registration.description = webinar.description;
  const start = new Date(webinar.schedule.startsAt);
  if (!Number.isNaN(start.getTime())) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: config.schedules.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(start);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    config.schedules.sessions = [{ id: randomId("ses", 6), date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}`, status: "open" }];
    if (webinar.schedule.endsAt) {
      const minutes = Math.round((new Date(webinar.schedule.endsAt).getTime() - start.getTime()) / 60000);
      if (minutes >= 5) config.schedules.durationMinutes = minutes;
    }
  }
  if (webinar.automatedSettings) {
    config.replay.enabled = webinar.automatedSettings.enableReplay;
    if (webinar.automatedSettings.replayExpiryDays) {
      config.replay.expiration = "days_after";
      config.replay.expiresAfterDays = webinar.automatedSettings.replayExpiryDays;
    }
  }
  // Legacy webinars were publicly joinable; keep that behaviour until the owner changes it.
  config.live.access = "anyone_with_link";
  return persist({ ...webinar, workflow: config });
}

export async function createDraft(user: User, initial?: Partial<WorkflowSectionData>): Promise<Webinar> {
  if (!canManageWebinar(user, { workspaceId: user.workspaceId }, "webinar.create")) throw new WorkflowError("You don't have permission to create webinars.", 403);
  const config = createDefaultWorkflowConfig({ hostName: user.name, hostEmail: user.email, timezone: await organizationTimezone(user.workspaceId) });
  if (initial) {
    for (const key of DATA_SECTION_KEYS) {
      if (initial[key]) (config as unknown as Record<string, unknown>)[key] = initial[key];
    }
  }
  config.integrations.webhook.secret = config.integrations.webhook.enabled ? randomId("whsec", 24) : "";
  const id = randomId("wb", 8);
  const now = new Date().toISOString();
  const base: Webinar = {
    id,
    slug: await uniqueSlug(config.configuration.title || `webinar-${id.slice(3).toLowerCase()}`),
    title: config.configuration.title || "Untitled webinar",
    description: config.configuration.description,
    status: "draft",
    type: "live",
    workspaceId: user.workspaceId,
    ownerId: user.id,
    videoSource: { id: randomId("vs", 6), provider: "youtube", url: "", title: "", isEmbedded: true },
    schedule: { id: randomId("sch", 6), startsAt: now, timezone: config.schedules.timezone },
    attendeeCount: 0,
    registrationCount: 0,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
  const created = await getStore().createWebinar(applyWorkflowToWebinar(base, config));
  await audit({ organizationId: created.workspaceId, actorUserId: user.id, actorEmail: user.email, action: "webinar.create", targetType: "webinar", targetId: created.id });
  return created;
}

/**
 * Apply section-scoped updates. Only the sections in the payload change, and a
 * section that was modified since the client's base version is rejected (409)
 * instead of silently overwriting someone else's edit.
 */
export async function updateSections(
  user: User,
  id: string,
  sections: Partial<WorkflowSectionData>,
  baseVersion: number,
  reviewed: WorkflowDataSectionKey[] = [],
): Promise<Webinar> {
  const webinar = await ensureWorkflow(user, await getOwnedWebinar(user, id));
  const current = webinar.workflow!;
  const keys = (Object.keys(sections) as WorkflowDataSectionKey[]).filter((k) => sections[k] !== undefined);
  // Progress markers: sections the owner has worked through (never removed once set).
  const reviewedBefore = current.reviewedSections ?? [];
  const reviewedNow = DATA_SECTION_KEYS.filter((k) => reviewedBefore.includes(k) || reviewed.includes(k));
  const reviewedChanged = reviewedNow.length !== reviewedBefore.length;
  if (keys.length === 0 && !reviewedChanged) return webinar;

  const conflicts = keys.filter((k) => (current.sectionVersions?.[k] ?? 0) > baseVersion);
  if (conflicts.length > 0) {
    throw new WorkflowError("These sections were changed elsewhere since you loaded them. Reload to get the latest version.", 409, { conflicts });
  }

  const nextVersion = current.version + 1;
  const next: WebinarWorkflowConfig = {
    ...current,
    version: nextVersion,
    sectionVersions: { ...current.sectionVersions },
    reviewedSections: reviewedNow,
  };
  for (const key of keys) {
    (next as unknown as Record<string, unknown>)[key] = sections[key];
    next.sectionVersions![key] = nextVersion;
  }

  // The webhook signing secret is server-managed and never taken from the client.
  if (sections.integrations) {
    const enabled = next.integrations.webhook.enabled;
    next.integrations = {
      ...next.integrations,
      webhook: { ...next.integrations.webhook, secret: enabled ? current.integrations.webhook.secret || randomId("whsec", 24) : current.integrations.webhook.secret },
    };
  }

  let slug = webinar.slug;
  if (webinar.status === "draft" && sections.configuration && next.configuration.title.trim() && next.configuration.title !== current.configuration.title) {
    // Slugs follow the title until the webinar is published, then stay stable.
    slug = await uniqueSlug(next.configuration.title, webinar.id);
  }

  return persist(applyWorkflowToWebinar({ ...webinar, slug }, next), current.version);
}

export async function publishWebinar(user: User, id: string): Promise<Webinar> {
  const webinar = await ensureWorkflow(user, await getOwnedWebinar(user, id, "webinar.publish"));
  const config = webinar.workflow!;
  const evaluation = evaluateWorkflow(config);
  if (!evaluation.canPublish) {
    throw new WorkflowError("Resolve the highlighted issues before publishing.", 422, { issues: evaluation.blockingIssues });
  }
  // Selling tickets needs a configured gateway and a plan that includes paid webinars (database mode).
  if (getStore().kind !== "mock" && config.integrations.payment.enabled && config.integrations.payment.price > 0) {
    if (!paymentsConfigured()) {
      throw new WorkflowError("Online payments aren't set up on this site yet, so paid webinars can't be published.", 422, {
        issues: [{ section: "integrations", message: "Online payments aren't configured yet. Turn off paid registration or try again later.", field: "payment.enabled", severity: "error" }],
      });
    }
    const { plan } = await getEffectivePlan(webinar.workspaceId);
    if (!SAAS_PLANS[plan].entitlements.allowPaidWebinars) {
      throw new WorkflowError("Your plan doesn't include paid webinars.", 422, {
        issues: [{ section: "integrations", message: `The ${SAAS_PLANS[plan].name} plan doesn't include paid webinars. Upgrade in Billing, or turn off paid registration.`, field: "payment.enabled", severity: "error" }],
      });
    }
  }
  const firstPublish = !config.publishedAt;
  const now = new Date();
  const nextConfig: WebinarWorkflowConfig = { ...config, publishedAt: config.publishedAt ?? now.toISOString() };
  const status: Webinar["status"] = config.configuration.mode === "schedule_later" ? "scheduled" : "live";
  const saved = await persist(applyWorkflowToWebinar({ ...webinar, status }, nextConfig, now), config.version);
  await audit({ organizationId: saved.workspaceId, actorUserId: user.id, actorEmail: user.email, action: firstPublish ? "webinar.publish" : "webinar.republish", targetType: "webinar", targetId: saved.id });

  if (firstPublish && config.notifications.host.readiness && config.notifications.host.recipientEmail) {
    await getEmailProvider().sendEmail({
      workspaceId: saved.workspaceId,
      webinarId: saved.id,
      recipientEmail: config.notifications.host.recipientEmail,
      recipientName: config.configuration.hostName,
      templateType: "host_new_registration",
      dedupeKey: `published:${saved.id}`,
      subjectOverride: `Your webinar is published: ${saved.title}`,
      variables: { webinar_title: saved.title },
      bodyText: `Your webinar "${saved.title}" is now published and accepting registrations.\n\nPublic page: ${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "")}/w/${saved.slug ?? saved.id}`,
    });
  }
  return saved;
}

/** Soft-delete a webinar (keeps registrations and payments for records). */
export async function deleteWebinar(user: User, id: string): Promise<void> {
  if (user.role !== "owner") throw new WorkflowError("Only workspace owners can delete webinars.", 403);
  const webinar = await getOwnedWebinar(user, id, "webinar.delete");
  await getStore().softDeleteWebinar(webinar.id);
  await audit({ organizationId: webinar.workspaceId, actorUserId: user.id, actorEmail: user.email, action: "webinar.delete", targetType: "webinar", targetId: webinar.id, metadata: { title: webinar.title } });
}
