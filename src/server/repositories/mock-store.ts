import { analyticsService } from "@/services/analytics-service";
import { mockWebinarRepository } from "@/services/mock-webinar-repository";
import type { Registration, Webinar } from "@/types";
import { ConcurrencyError, type WebinarStore } from "./types";

/** In-memory store backing explicit demo mode. Not used when a database is configured. */
export const mockStore: WebinarStore = {
  kind: "mock",
  async listWebinars(workspaceId) {
    return mockWebinarRepository.list().filter((w) => w.workspaceId === workspaceId);
  },
  async listWebinarsByStatus(workspaceId, status) {
    return mockWebinarRepository.listByStatus(status).filter((w) => w.workspaceId === workspaceId);
  },
  async listActiveWebinars() {
    return mockWebinarRepository.list().filter((w) => w.status !== "draft");
  },
  async getWebinar(id) {
    return mockWebinarRepository.getById(id);
  },
  async getWebinarBySlug(slug) {
    return mockWebinarRepository.getBySlug(slug);
  },
  async getWebinarByPublicId(publicId) {
    return mockWebinarRepository.getByPublicId(publicId);
  },
  async isSlugTaken(slug, excludeId) {
    return mockWebinarRepository.list().some((w) => w.slug === slug && w.id !== excludeId);
  },
  async createWebinar(webinar) {
    return mockWebinarRepository.save(webinar);
  },
  async updateWebinar(webinar, options) {
    if (options?.expectedVersion !== undefined) {
      const current = mockWebinarRepository.getById(webinar.id);
      if (current?.workflow && current.workflow.version !== options.expectedVersion) throw new ConcurrencyError();
    }
    return mockWebinarRepository.save(webinar);
  },
  async softDeleteWebinar(id) {
    mockWebinarRepository.delete(id);
  },
  async listRegistrations(webinarId) {
    return mockWebinarRepository.listRegistrations(webinarId);
  },
  async listWorkspaceRegistrations(workspaceId, limit = 200) {
    const webinars = mockWebinarRepository.list().filter((w) => w.workspaceId === workspaceId);
    const titles = new Map(webinars.map((w) => [w.id, w.title]));
    return webinars
      .flatMap((w) => mockWebinarRepository.listRegistrations(w.id))
      .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
      .slice(0, limit)
      .map((r) => ({ ...r, webinarTitle: titles.get(r.webinarId) ?? "" }));
  },
  async countActiveRegistrations(webinarId) {
    return mockWebinarRepository.listRegistrations(webinarId).filter((r) => r.status !== "cancelled").length;
  },
  async createRegistration(input, options) {
    if (mockWebinarRepository.findRegistrationByEmail(input.webinarId, input.email)) return { status: "duplicate" };
    const active = mockWebinarRepository.listRegistrations(input.webinarId).filter((r) => r.status !== "cancelled").length;
    if (options?.capacity != null && active >= options.capacity) return { status: "full" };
    const registration: Registration = { ...input, id: input.id ?? `reg_${crypto.randomUUID().slice(0, 12)}` };
    mockWebinarRepository.addRegistration(registration);
    return { status: "created", registration };
  },
  async getRegistration(id) {
    return mockWebinarRepository.getRegistration(id);
  },
  async findRegistrationByEmail(webinarId, email) {
    return mockWebinarRepository.findRegistrationByEmail(webinarId, email);
  },
  async updateRegistration(id, patch) {
    return mockWebinarRepository.updateRegistration(id, patch);
  },
  async recordEvent(event) {
    analyticsService.recordEvent({ ...event, timestamp: new Date().toISOString() });
  },
  async getRegistrationFunnel(webinarId) {
    return analyticsService.getRegistrationFunnel(webinarId);
  },
  async recordAttendance(entry) {
    analyticsService.recordEvent({ workspaceId: entry.workspaceId, webinarId: entry.webinarId, eventType: "webinar_room_entered", timestamp: new Date().toISOString() });
  },
} satisfies WebinarStore & { createWebinar(w: Webinar): Promise<Webinar> };
