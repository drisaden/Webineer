import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type {
  Registration as RegistrationRow,
  RegistrationSource as DbRegistrationSource,
  SessionStatus as DbSessionStatus,
  Webinar as WebinarRow,
} from "@/generated/prisma/client";
import { applyWorkflowToWebinar } from "@/lib/webinar-workflow/sync";
import { resolveSessions } from "@/lib/webinar-workflow/time";
import { getPrisma } from "@/server/db/prisma";
import type {
  Registration,
  RegistrationAnalyticsSummary,
  RegistrationSource,
  VideoProviderValue,
  Webinar,
  WebinarStatus,
  WebinarType,
  WebinarWorkflowConfig,
} from "@/types";
import { ConcurrencyError, type WebinarStore } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined): v is string => Boolean(v && UUID_RE.test(v));
const upper = <T extends string>(v: string) => v.toUpperCase() as T;
const lower = <T extends string>(v: string) => v.toLowerCase() as T;
const json = (v: unknown) => v as Prisma.InputJsonValue;

const REG_SOURCES: RegistrationSource[] = ["hosted", "inline", "popup", "button", "direct"];
const DB_SOURCES = ["HOSTED", "INLINE", "POPUP", "BUTTON", "DIRECT", "IMPORT"];

// ---------------------------------------------------------------------------
// Mapping: rows <-> domain
// ---------------------------------------------------------------------------

export function webinarFromRow(row: WebinarRow): Webinar {
  const startsAt = (row.startsAt ?? row.createdAt).toISOString();
  const base: Webinar = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: (row.status === "ARCHIVED" ? "completed" : lower(row.status)) as WebinarStatus,
    type: lower<WebinarType>(row.type),
    workspaceId: row.organizationId,
    ownerId: row.ownerId ?? "",
    videoSource: {
      id: `vs_${row.id}`,
      provider: lower<VideoProviderValue>(row.videoProvider ?? "YOUTUBE"),
      url: row.videoUrl ?? "",
      title: row.title,
      isEmbedded: row.videoProvider !== "CUSTOM_URL",
      thumbnailUrl: row.coverImageUrl ?? undefined,
      durationSeconds: row.durationMinutes * 60,
    },
    schedule: {
      id: `sch_${row.id}`,
      startsAt,
      endsAt: row.endsAt?.toISOString(),
      timezone: row.timezone,
    },
    attendeeCount: row.attendeeCount,
    registrationCount: row.registrationCount,
    tags: row.tags,
    registrationUrl: `/w/${row.slug}`,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  const workflow = row.workflow as WebinarWorkflowConfig | null;
  // The workflow JSON is the source of truth; derived fields (schedule, video,
  // room settings) are recomputed so they always reflect the current time.
  return workflow ? applyWorkflowToWebinar(base, workflow) : base;
}

function webinarToRow(w: Webinar) {
  const wf = w.workflow;
  const duration = wf?.schedules.durationMinutes ?? (w.schedule.endsAt ? Math.round((Date.parse(w.schedule.endsAt) - Date.parse(w.schedule.startsAt)) / 60000) : 60);
  return {
    slug: w.slug ?? `webinar-${randomUUID().slice(0, 8)}`,
    publicId: wf?.publicId ?? randomUUID().replace(/-/g, "").slice(0, 14),
    title: w.title.slice(0, 300),
    description: w.description ?? "",
    status: upper<WebinarRow["status"]>(w.status),
    type: upper<WebinarRow["type"]>(w.type),
    mode: wf?.configuration.mode ? upper<NonNullable<WebinarRow["mode"]>>(wf.configuration.mode) : null,
    category: wf?.configuration.category || null,
    coverImageUrl: wf?.configuration.coverImageUrl || w.videoSource.thumbnailUrl || null,
    timezone: w.schedule.timezone || "UTC",
    durationMinutes: Math.max(1, duration || 60),
    startsAt: w.schedule.startsAt ? new Date(w.schedule.startsAt) : null,
    endsAt: w.schedule.endsAt ? new Date(w.schedule.endsAt) : null,
    videoProvider: w.videoSource.provider ? upper<NonNullable<WebinarRow["videoProvider"]>>(w.videoSource.provider) : null,
    videoUrl: w.videoSource.url || null,
    workflow: wf ? json(wf) : Prisma.DbNull,
    workflowVersion: wf?.version ?? 1,
    tags: w.tags ?? [],
    publishedAt: wf?.publishedAt ? new Date(wf.publishedAt) : null,
  };
}

export function registrationFromRow(row: RegistrationRow): Registration {
  const extra = (row.metadata ?? {}) as Record<string, unknown>;
  const { transactionId, ...rest } = extra;
  return {
    id: row.id,
    webinarId: row.webinarId,
    name: row.name,
    email: row.email,
    company: row.company ?? undefined,
    paymentStatus: row.paymentStatus === "FAILED" ? "pending" : lower<NonNullable<Registration["paymentStatus"]>>(row.paymentStatus),
    transactionId: typeof transactionId === "string" ? transactionId : undefined,
    selectedSessionSlot: row.sessionStartsAt?.toISOString(),
    registeredAt: row.registeredAt.toISOString(),
    source: lower(row.source),
    status: lower(row.status),
    metadata: {
      ...rest,
      phone: row.phone ?? undefined,
      answers: row.answers,
      sessionStartsAt: row.sessionStartsAt?.toISOString(),
      embedOrigin: row.embedOrigin ?? undefined,
    },
  };
}

function registrationToRow(r: Omit<Registration, "id">) {
  const meta = { ...(r.metadata ?? {}) } as Record<string, unknown>;
  const phone = typeof meta.phone === "string" ? meta.phone : null;
  const answers = meta.answers && typeof meta.answers === "object" ? meta.answers : {};
  const sessionStartsAt = (typeof meta.sessionStartsAt === "string" && meta.sessionStartsAt) || r.selectedSessionSlot || null;
  const embedOrigin = typeof meta.embedOrigin === "string" ? meta.embedOrigin : null;
  // Access keys are derived (HMAC), never stored. Structured fields live in their own columns.
  for (const k of ["accessKey", "phone", "answers", "sessionStartsAt", "embedOrigin"]) delete meta[k];
  if (r.transactionId) meta.transactionId = r.transactionId;
  const source = r.source.toUpperCase();
  return {
    email: r.email.trim().toLowerCase(),
    name: r.name,
    phone,
    company: r.company ?? null,
    answers: json(answers),
    source: (DB_SOURCES.includes(source) ? source : "DIRECT") as DbRegistrationSource,
    status: upper<RegistrationRow["status"]>(r.status),
    paymentStatus: upper<RegistrationRow["paymentStatus"]>(r.paymentStatus ?? "free"),
    sessionStartsAt: sessionStartsAt ? new Date(sessionStartsAt) : null,
    embedOrigin,
    ...(r.registeredAt && !Number.isNaN(Date.parse(r.registeredAt)) ? { registeredAt: new Date(r.registeredAt) } : {}),
    metadata: Object.keys(meta).length ? json(meta) : Prisma.DbNull,
  };
}

// ---------------------------------------------------------------------------
// Child-table sync (presenters, sessions) from the workflow configuration
// ---------------------------------------------------------------------------

async function syncChildren(tx: Prisma.TransactionClient, webinarId: string, organizationId: string, wf: WebinarWorkflowConfig | undefined, published: boolean) {
  if (!wf) return;
  await tx.presenter.deleteMany({ where: { webinarId } });
  const presenters = wf.configuration.presenters.filter((p) => p.name.trim());
  if (presenters.length) {
    await tx.presenter.createMany({
      data: presenters.map((p, i) => ({ organizationId, webinarId, name: p.name, title: p.title || null, bio: p.bio || null, avatarUrl: p.avatarUrl || null, sortOrder: i })),
    });
  }

  const sessions = wf.configuration.mode === "schedule_later" ? resolveSessions(wf.schedules) : [];
  const keys = sessions.map((s) => s.id);
  await tx.webinarSession.deleteMany({ where: { webinarId, ...(keys.length ? { sourceKey: { notIn: keys } } : {}) } });
  for (const s of sessions) {
    const data = {
      startsAt: new Date(s.startsAt),
      endsAt: new Date(s.endsAt),
      timezone: wf.schedules.timezone,
      status: upper<DbSessionStatus>(s.status),
      capacity: wf.registration.capacity,
      isRecurring: s.id.includes("_r"),
    };
    await tx.webinarSession.upsert({
      where: { webinarId_sourceKey: { webinarId, sourceKey: s.id } },
      create: { organizationId, webinarId, sourceKey: s.id, ...data },
      update: data,
    });
  }

  // The registration page is configured in the workflow's Registration section;
  // the landing_pages row mirrors it so pages can be listed and queried.
  const r = wf.registration;
  const pageData = {
    title: (r.headline || wf.configuration.title || "Registration page").slice(0, 300),
    description: r.description || wf.configuration.description || "",
    status: (published ? "PUBLISHED" : "DRAFT") as "PUBLISHED" | "DRAFT",
    settings: json({ pageTitle: r.pageTitle, coverImageUrl: r.coverImageUrl, buttonText: r.buttonText, accentColor: r.accentColor, showDateTime: r.showDateTime, showPresenters: r.showPresenters, showVideoPreview: r.showVideoPreview }),
    publishedAt: published && wf.publishedAt ? new Date(wf.publishedAt) : null,
  };
  const page = await tx.landingPage.findFirst({ where: { webinarId }, select: { id: true } });
  if (page) await tx.landingPage.update({ where: { id: page.id }, data: pageData });
  else await tx.landingPage.create({ data: { organizationId, webinarId, ...pageData } });
}

const notDeleted = { deletedAt: null } as const;

function emptyFunnel(): RegistrationAnalyticsSummary {
  return {
    pageViews: 0,
    submissions: 0,
    successfulRegistrations: 0,
    conversionRate: null,
    bySource: Object.fromEntries(REG_SOURCES.map((s) => [s, { views: 0, registrations: 0 }])) as RegistrationAnalyticsSummary["bySource"],
  };
}

// ---------------------------------------------------------------------------


/** Registrations that hold a seat: free/paid ones, plus unpaid checkouts started in the last 30 minutes. */
const SEAT_HOLD_MS = 30 * 60 * 1000;
function holdsSeat(webinarId: string) {
  return {
    webinarId,
    status: { not: "CANCELLED" as const },
    OR: [{ paymentStatus: { in: ["FREE" as const, "PAID" as const] } }, { paymentStatus: "PENDING" as const, registeredAt: { gte: new Date(Date.now() - SEAT_HOLD_MS) } }],
  };
}

export const prismaStore: WebinarStore = {
  kind: "database",

  async listWebinars(workspaceId) {
    if (!isUuid(workspaceId)) return [];
    const rows = await getPrisma().webinar.findMany({ where: { organizationId: workspaceId, ...notDeleted }, orderBy: { createdAt: "desc" } });
    return rows.map(webinarFromRow);
  },

  async listWebinarsByStatus(workspaceId, status) {
    if (!isUuid(workspaceId)) return [];
    const rows = await getPrisma().webinar.findMany({
      where: { organizationId: workspaceId, status: upper<WebinarRow["status"]>(status), ...notDeleted },
      orderBy: { startsAt: status === "completed" ? "desc" : "asc" },
    });
    return rows.map(webinarFromRow);
  },

  async listActiveWebinars() {
    const rows = await getPrisma().webinar.findMany({ where: { status: { notIn: ["DRAFT", "ARCHIVED"] }, ...notDeleted } });
    return rows.map(webinarFromRow);
  },

  async getWebinar(id) {
    if (!isUuid(id)) return undefined;
    const row = await getPrisma().webinar.findFirst({ where: { id, ...notDeleted } });
    return row ? webinarFromRow(row) : undefined;
  },

  async getWebinarBySlug(slug) {
    const row = await getPrisma().webinar.findFirst({ where: { slug, ...notDeleted } });
    return row ? webinarFromRow(row) : undefined;
  },

  async getWebinarByPublicId(publicId) {
    const row = await getPrisma().webinar.findFirst({ where: { publicId, ...notDeleted } });
    return row ? webinarFromRow(row) : undefined;
  },

  async isSlugTaken(slug, excludeId) {
    // Soft-deleted webinars keep their slug reserved so old links never point at new content.
    const row = await getPrisma().webinar.findUnique({ where: { slug }, select: { id: true } });
    return Boolean(row && row.id !== excludeId);
  },

  async createWebinar(webinar) {
    const db = getPrisma();
    if (!isUuid(webinar.workspaceId)) throw new Error("Webinars must belong to an organization.");
    const row = await db.$transaction(async (tx) => {
      const created = await tx.webinar.create({
        data: { ...webinarToRow(webinar), organizationId: webinar.workspaceId, ownerId: isUuid(webinar.ownerId) ? webinar.ownerId : null },
      });
      await syncChildren(tx, created.id, created.organizationId, webinar.workflow, webinar.status !== "draft");
      return created;
    });
    return webinarFromRow(row);
  },

  async updateWebinar(webinar, options) {
    const db = getPrisma();
    if (!isUuid(webinar.id)) throw new Error("Unknown webinar.");
    const row = await db.$transaction(async (tx) => {
      const data = webinarToRow(webinar);
      // Tenant and identity columns are never changed by an update.
      const where = { id: webinar.id, organizationId: webinar.workspaceId, ...notDeleted, ...(options?.expectedVersion !== undefined ? { workflowVersion: options.expectedVersion } : {}) };
      const result = await tx.webinar.updateMany({ where, data: { ...data, registrationCount: undefined } });
      if (result.count === 0) {
        if (options?.expectedVersion !== undefined) throw new ConcurrencyError();
        throw new Error("Webinar not found.");
      }
      await syncChildren(tx, webinar.id, webinar.workspaceId, webinar.workflow, webinar.status !== "draft");
      return tx.webinar.findUniqueOrThrow({ where: { id: webinar.id } });
    });
    return webinarFromRow(row);
  },

  async softDeleteWebinar(id) {
    if (!isUuid(id)) return;
    await getPrisma().webinar.updateMany({ where: { id, ...notDeleted }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  },

  async listRegistrations(webinarId) {
    if (!isUuid(webinarId)) return [];
    const rows = await getPrisma().registration.findMany({ where: { webinarId }, orderBy: { registeredAt: "desc" } });
    return rows.map(registrationFromRow);
  },

  async listWorkspaceRegistrations(workspaceId, limit = 200) {
    if (!isUuid(workspaceId)) return [];
    const rows = await getPrisma().registration.findMany({
      where: { organizationId: workspaceId, webinar: { deletedAt: null } },
      include: { webinar: { select: { title: true } } },
      orderBy: { registeredAt: "desc" },
      take: Math.min(limit, 1000),
    });
    return rows.map((r) => ({ ...registrationFromRow(r), webinarTitle: r.webinar.title }));
  },

  async countActiveRegistrations(webinarId) {
    if (!isUuid(webinarId)) return 0;
    return getPrisma().registration.count({ where: holdsSeat(webinarId) });
  },

  async createRegistration(input, options) {
    const db = getPrisma();
    if (!isUuid(input.webinarId)) throw new Error("Unknown webinar.");
    const data = registrationToRow(input);
    try {
      return await db.$transaction(async (tx) => {
        // Serialise registrations per webinar so capacity can't be exceeded by concurrent requests.
        const locked = await tx.$queryRaw<{ organization_id: string }[]>`SELECT organization_id FROM webinars WHERE id = ${input.webinarId}::uuid AND deleted_at IS NULL FOR UPDATE`;
        if (locked.length === 0) throw new Error("Unknown webinar.");
        const organizationId = locked[0].organization_id;

        const existing = await tx.registration.findUnique({ where: { webinarId_email: { webinarId: input.webinarId, email: data.email } } });
        if (existing && existing.status !== "CANCELLED") return { status: "duplicate" as const };
        if (options?.capacity != null) {
          const active = await tx.registration.count({ where: holdsSeat(input.webinarId) });
          if (active >= options.capacity) return { status: "full" as const };
        }
        const session = data.sessionStartsAt
          ? await tx.webinarSession.findFirst({ where: { webinarId: input.webinarId, startsAt: data.sessionStartsAt }, select: { id: true } })
          : null;
        const row = existing
          ? await tx.registration.update({ where: { id: existing.id }, data: { ...data, sessionId: session?.id ?? null, cancelledAt: null, registeredAt: new Date() } })
          : await tx.registration.create({ data: { ...data, organizationId, webinarId: input.webinarId, sessionId: session?.id ?? null, ...(isUuid(input.id) ? { id: input.id } : {}) } });
        await tx.webinar.update({ where: { id: input.webinarId }, data: { registrationCount: { increment: 1 } } });
        return { status: "created" as const, registration: registrationFromRow(row) };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { status: "duplicate" };
      throw error;
    }
  },

  async getRegistration(id) {
    if (!isUuid(id)) return undefined;
    const row = await getPrisma().registration.findUnique({ where: { id } });
    return row ? registrationFromRow(row) : undefined;
  },

  async findRegistrationByEmail(webinarId, email) {
    if (!isUuid(webinarId)) return undefined;
    const row = await getPrisma().registration.findFirst({ where: { webinarId, email: email.trim().toLowerCase(), status: { not: "CANCELLED" } } });
    return row ? registrationFromRow(row) : undefined;
  },

  async updateRegistration(id, patch) {
    if (!isUuid(id)) return undefined;
    const db = getPrisma();
    const current = await db.registration.findUnique({ where: { id } });
    if (!current) return undefined;
    const merged = { ...registrationFromRow(current), ...patch, id };
    const data = registrationToRow(merged);
    const row = await db.registration.update({
      where: { id },
      data: { ...data, email: current.email, cancelledAt: merged.status === "cancelled" ? current.cancelledAt ?? new Date() : null },
    });
    return registrationFromRow(row);
  },

  async recordEvent(event) {
    if (!isUuid(event.webinarId) || !isUuid(event.workspaceId)) return;
    await getPrisma().analyticsEvent.create({
      data: {
        organizationId: event.workspaceId,
        webinarId: event.webinarId,
        type: event.eventType,
        source: event.source ?? null,
        registrationId: isUuid(event.registrationId) ? event.registrationId : null,
        metadata: event.metadata ? json(event.metadata) : Prisma.DbNull,
      },
    });
  },

  async getRegistrationFunnel(webinarId) {
    const funnel = emptyFunnel();
    if (!isUuid(webinarId)) return funnel;
    const groups = await getPrisma().analyticsEvent.groupBy({
      by: ["type", "source"],
      where: { webinarId, type: { in: ["landing_page_viewed", "registration_started", "registration_completed"] } },
      _count: { _all: true },
    });
    for (const g of groups) {
      const n = g._count._all;
      const source = (REG_SOURCES as string[]).includes(g.source ?? "") ? (g.source as RegistrationSource) : "direct";
      if (g.type === "landing_page_viewed") {
        funnel.pageViews += n;
        funnel.bySource[source].views += n;
      } else if (g.type === "registration_started") funnel.submissions += n;
      else {
        funnel.successfulRegistrations += n;
        funnel.bySource[source].registrations += n;
      }
    }
    funnel.conversionRate = funnel.pageViews > 0 ? Math.round((funnel.successfulRegistrations / funnel.pageViews) * 1000) / 10 : null;
    return funnel;
  },

  async recordAttendance(entry) {
    if (!isUuid(entry.webinarId) || !isUuid(entry.workspaceId)) return;
    const db = getPrisma();
    await db.$transaction(async (tx) => {
      const registrationId = isUuid(entry.registrationId) ? entry.registrationId : null;
      const firstVisit = registrationId ? (await tx.attendee.count({ where: { registrationId } })) === 0 : true;
      const session = entry.sessionStartsAt
        ? await tx.webinarSession.findFirst({ where: { webinarId: entry.webinarId, startsAt: new Date(entry.sessionStartsAt) }, select: { id: true } })
        : null;
      await tx.attendee.create({ data: { organizationId: entry.workspaceId, webinarId: entry.webinarId, registrationId, sessionId: session?.id ?? null } });
      if (firstVisit) await tx.webinar.update({ where: { id: entry.webinarId }, data: { attendeeCount: { increment: 1 } } });
      await tx.analyticsEvent.create({ data: { organizationId: entry.workspaceId, webinarId: entry.webinarId, type: "webinar_room_entered", registrationId } });
    });
  },
};
