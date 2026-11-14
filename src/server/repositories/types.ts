import type { AnalyticsEventType, Registration, RegistrationAnalyticsSummary, Webinar, WebinarStatus } from "@/types";

/**
 * Async persistence boundary for webinars and their audience.
 * Implementations: Prisma (production) and the in-memory mock (explicit demo mode only).
 *
 * Lookups by id/slug/publicId are NOT tenant-scoped by themselves: callers must
 * check `webinar.workspaceId` against the authorized organization (see
 * webinar-workflow-service) or only expose public-safe data.
 */
export interface WebinarStore {
  readonly kind: "database" | "mock";
  listWebinars(workspaceId: string): Promise<Webinar[]>;
  listWebinarsByStatus(workspaceId: string, status: WebinarStatus): Promise<Webinar[]>;
  /** Published webinars across all tenants, for internal schedulers only. */
  listActiveWebinars(): Promise<Webinar[]>;
  getWebinar(id: string): Promise<Webinar | undefined>;
  getWebinarBySlug(slug: string): Promise<Webinar | undefined>;
  getWebinarByPublicId(publicId: string): Promise<Webinar | undefined>;
  isSlugTaken(slug: string, excludeId?: string): Promise<boolean>;
  createWebinar(webinar: Webinar): Promise<Webinar>;
  /**
   * Persist changes. With `expectedVersion`, the update only applies if the
   * stored workflow version still matches (optimistic concurrency).
   */
  updateWebinar(webinar: Webinar, options?: { expectedVersion?: number }): Promise<Webinar>;
  softDeleteWebinar(id: string): Promise<void>;

  listRegistrations(webinarId: string): Promise<Registration[]>;
  /** Most recent registrations across a workspace's webinars (tenant-scoped). */
  listWorkspaceRegistrations(workspaceId: string, limit?: number): Promise<(Registration & { webinarTitle: string })[]>;
  countActiveRegistrations(webinarId: string): Promise<number>;
  /**
   * Insert a registration atomically: enforces capacity (if given) and the
   * one-registration-per-email rule. Returns "duplicate"/"full" instead of throwing.
   */
  createRegistration(registration: Omit<Registration, "id"> & { id?: string }, options?: { capacity?: number | null }): Promise<{ status: "created"; registration: Registration } | { status: "duplicate" | "full" }>;
  getRegistration(id: string): Promise<Registration | undefined>;
  findRegistrationByEmail(webinarId: string, email: string): Promise<Registration | undefined>;
  updateRegistration(id: string, patch: Partial<Registration>): Promise<Registration | undefined>;

  recordEvent(event: { workspaceId: string; webinarId: string; eventType: AnalyticsEventType; source?: string; registrationId?: string; metadata?: Record<string, unknown> }): Promise<void>;
  getRegistrationFunnel(webinarId: string): Promise<RegistrationAnalyticsSummary>;
  recordAttendance(entry: { workspaceId: string; webinarId: string; registrationId?: string | null; sessionStartsAt?: string | null }): Promise<void>;
}

export class ConcurrencyError extends Error {
  constructor() {
    super("The webinar was changed by someone else. Reload to get the latest version.");
    this.name = "ConcurrencyError";
  }
}
