import {
  mockAnalytics,
  mockDiscountCodes,
  mockRegistrations,
  mockTickets,
  mockTimelineEvents,
  mockWebinars,
} from "@/data/mock/webinars";
import type {
  AuditLog,
  DiscountCode,
  Registration,
  TicketType,
  TimelineEvent,
  VideoProvider,
  Webinar,
  WorkspaceMember,
} from "@/types";

export const mockVideoProviders: VideoProvider[] = [
  {
    id: "youtube",
    label: "YouTube",
    description: "Embed publicly shared YouTube videos and use native player controls.",
    supportsEmbed: true,
    supportsUpload: false,
    supportsCustomHtml: false,
    canExtractId: true,
    validationPattern: "^(https?:\\/\\/)?(www\\.)?(youtube\\.com|youtu\\.be)/.+$",
    embedHint: "Use a valid YouTube watch URL or share link.",
    playerCapabilities: ["play", "pause", "seek", "mute", "fullscreen", "time_sync"],
  },
  {
    id: "vimeo",
    label: "Vimeo",
    description: "Embed Vimeo content while keeping the webinar experience configurable.",
    supportsEmbed: true,
    supportsUpload: false,
    supportsCustomHtml: false,
    canExtractId: true,
    validationPattern: "^(https?:\\/\\/)?(www\\.)?vimeo\\.com/.+$",
    embedHint: "Use a valid Vimeo share URL.",
    playerCapabilities: ["play", "pause", "seek", "fullscreen", "time_sync"],
  },
  {
    id: "custom_iframe",
    label: "Custom iframe",
    description: "Render trusted iframe content with sanitized embed rules and platform controls.",
    supportsEmbed: true,
    supportsUpload: false,
    supportsCustomHtml: true,
    canExtractId: false,
    validationPattern: "^https?:\\/\\/.*$",
    embedHint: "Provide a trusted embed URL or iframe source.",
    playerCapabilities: ["iframe", "sandbox", "fullscreen"],
  },
  {
    id: "uploaded_video",
    label: "Uploaded video",
    description: "Use a native upload or a browser-hosted file source in an app-managed player.",
    supportsEmbed: true,
    supportsUpload: true,
    supportsCustomHtml: false,
    canExtractId: false,
    validationPattern: "^.+\\.(mp4|webm|mov|m4v)$",
    embedHint: "Upload a supported video file for local playback.",
    playerCapabilities: ["play", "pause", "seek", "volume", "time_sync"],
  },
];

const webinarsState: Webinar[] = [...mockWebinars];
const registrationsState: Registration[] = [...mockRegistrations];
const ticketsState: TicketType[] = [...mockTickets];
const timelineEventsState: TimelineEvent[] = [...mockTimelineEvents];
const discountCodesState: DiscountCode[] = [...mockDiscountCodes];

const teamMembersState: WorkspaceMember[] = [
  {
    id: "mem_001",
    workspaceId: "ws_001",
    userId: "user_001",
    name: "Avery Morgan",
    email: "avery@northstarstudio.co",
    role: "owner",
    joinedAt: "2026-08-01T10:00:00Z",
    status: "active",
  },
  {
    id: "mem_002",
    workspaceId: "ws_001",
    userId: "user_002",
    name: "Damilola Adebayo",
    email: "dami@northstarstudio.co",
    role: "admin",
    joinedAt: "2026-09-15T14:30:00Z",
    status: "active",
  },
  {
    id: "mem_003",
    workspaceId: "ws_001",
    userId: "user_003",
    name: "Sarah Chen",
    email: "sarah@northstarstudio.co",
    role: "host",
    joinedAt: "2026-10-01T09:15:00Z",
    status: "active",
  },
  {
    id: "mem_004",
    workspaceId: "ws_001",
    userId: "user_004",
    name: "Emeka Okafor",
    email: "emeka@northstarstudio.co",
    role: "analyst",
    joinedAt: "2026-10-20T11:00:00Z",
    status: "active",
  },
];

const auditLogsState: AuditLog[] = [
  {
    id: "aud_001",
    workspaceId: "ws_001",
    actorName: "Avery Morgan",
    actorEmail: "avery@northstarstudio.co",
    action: "webinar.create",
    resource: "Webinar: wb_001",
    timestamp: "2026-10-01T12:00:00Z",
  },
  {
    id: "aud_002",
    workspaceId: "ws_001",
    actorName: "Damilola Adebayo",
    actorEmail: "dami@northstarstudio.co",
    action: "ticket.create",
    resource: "Ticket: VIP Pass & Templates (tkt_002)",
    timestamp: "2026-10-05T14:00:00Z",
  },
  {
    id: "aud_003",
    workspaceId: "ws_001",
    actorName: "Avery Morgan",
    actorEmail: "avery@northstarstudio.co",
    action: "domain.verify",
    resource: "Domain: webinars.northstarstudio.co",
    timestamp: "2026-11-01T16:20:00Z",
  },
];

export interface WebinarRepository {
  list(): Webinar[];
  listByStatus(status: Webinar["status"]): Webinar[];
  listByType(type: Webinar["type"]): Webinar[];
  getById(id: string): Webinar | undefined;
  getBySlug(slug: string): Webinar | undefined;
  save(webinar: Webinar): Webinar;
  delete(id: string): boolean;
  
  // Registrations
  listRegistrations(webinarId?: string): Registration[];
  addRegistration(registration: Registration): Registration;
  
  // Tickets & Monetization
  listTickets(webinarId: string): TicketType[];
  addTicket(ticket: TicketType): TicketType;
  getDiscountCode(code: string, webinarId?: string): DiscountCode | undefined;
  
  // Timeline events
  listTimelineEvents(webinarId: string): TimelineEvent[];
  saveTimelineEvent(event: TimelineEvent): TimelineEvent;
  deleteTimelineEvent(id: string): boolean;

  // Team & Audit
  listTeamMembers(): WorkspaceMember[];
  inviteMember(email: string, role: WorkspaceMember["role"], name: string): WorkspaceMember;
  updateMemberRole(memberId: string, role: WorkspaceMember["role"]): boolean;
  removeMember(memberId: string): boolean;
  listAuditLogs(): AuditLog[];
}

export const mockWebinarRepository: WebinarRepository = {
  list() {
    return webinarsState;
  },
  listByStatus(status) {
    return webinarsState.filter((webinar) => webinar.status === status);
  },
  listByType(type) {
    return webinarsState.filter((webinar) => webinar.type === type);
  },
  getById(id) {
    return webinarsState.find((webinar) => webinar.id === id);
  },
  getBySlug(slug) {
    return webinarsState.find((webinar) => webinar.slug === slug);
  },
  save(webinar) {
    const idx = webinarsState.findIndex((w) => w.id === webinar.id);
    if (idx >= 0) {
      webinarsState[idx] = { ...webinar, updatedAt: new Date().toISOString() };
      return webinarsState[idx];
    } else {
      const created = { ...webinar, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      webinarsState.unshift(created);
      return created;
    }
  },
  delete(id) {
    const idx = webinarsState.findIndex((w) => w.id === id);
    if (idx >= 0) {
      webinarsState.splice(idx, 1);
      return true;
    }
    return false;
  },
  listRegistrations(webinarId) {
    if (webinarId) {
      return registrationsState.filter((r) => r.webinarId === webinarId);
    }
    return registrationsState;
  },
  addRegistration(registration) {
    registrationsState.unshift(registration);
    const webinar = webinarsState.find((w) => w.id === registration.webinarId);
    if (webinar) {
      webinar.registrationCount += 1;
    }
    return registration;
  },
  listTickets(webinarId) {
    return ticketsState.filter((t) => t.webinarId === webinarId);
  },
  addTicket(ticket) {
    ticketsState.push(ticket);
    const webinar = webinarsState.find((w) => w.id === ticket.webinarId);
    if (webinar) {
      webinar.tickets = webinar.tickets || [];
      webinar.tickets.push(ticket);
    }
    return ticket;
  },
  getDiscountCode(code, webinarId) {
    const trimmed = code.trim().toUpperCase();
    return discountCodesState.find(
      (d) =>
        d.enabled &&
        d.code.toUpperCase() === trimmed &&
        (!d.webinarId || d.webinarId === webinarId) &&
        (!d.expiresAt || new Date(d.expiresAt) > new Date()),
    );
  },
  listTimelineEvents(webinarId) {
    return timelineEventsState
      .filter((e) => e.webinarId === webinarId)
      .sort((a, b) => a.timeOffsetSec - b.timeOffsetSec);
  },
  saveTimelineEvent(event) {
    const idx = timelineEventsState.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      timelineEventsState[idx] = event;
      return event;
    }
    timelineEventsState.push(event);
    return event;
  },
  deleteTimelineEvent(id) {
    const idx = timelineEventsState.findIndex((e) => e.id === id);
    if (idx >= 0) {
      timelineEventsState.splice(idx, 1);
      return true;
    }
    return false;
  },
  listTeamMembers() {
    return teamMembersState;
  },
  inviteMember(email, role, name) {
    const newMember: WorkspaceMember = {
      id: `mem_${Date.now()}`,
      workspaceId: "ws_001",
      userId: `usr_${Date.now()}`,
      name,
      email,
      role,
      joinedAt: new Date().toISOString(),
      status: "invited",
    };
    teamMembersState.push(newMember);
    auditLogsState.unshift({
      id: `aud_${Date.now()}`,
      workspaceId: "ws_001",
      actorName: "Avery Morgan",
      actorEmail: "avery@northstarstudio.co",
      action: "member.invite",
      resource: `Member: ${email} (${role})`,
      timestamp: new Date().toISOString(),
    });
    return newMember;
  },
  updateMemberRole(memberId, role) {
    const member = teamMembersState.find((m) => m.id === memberId);
    if (member) {
      member.role = role;
      auditLogsState.unshift({
        id: `aud_${Date.now()}`,
        workspaceId: "ws_001",
        actorName: "Avery Morgan",
        actorEmail: "avery@northstarstudio.co",
        action: "member.role_update",
        resource: `Member: ${member.email} -> ${role}`,
        timestamp: new Date().toISOString(),
      });
      return true;
    }
    return false;
  },
  removeMember(memberId) {
    const idx = teamMembersState.findIndex((m) => m.id === memberId);
    if (idx >= 0) {
      const removed = teamMembersState.splice(idx, 1)[0];
      auditLogsState.unshift({
        id: `aud_${Date.now()}`,
        workspaceId: "ws_001",
        actorName: "Avery Morgan",
        actorEmail: "avery@northstarstudio.co",
        action: "member.remove",
        resource: `Member: ${removed.email}`,
        timestamp: new Date().toISOString(),
      });
      return true;
    }
    return false;
  },
  listAuditLogs() {
    return auditLogsState;
  },
};
