import type { CustomDomain, WorkspaceBranding } from "@/types";

const inMemoryDomains: CustomDomain[] = [
  {
    id: "dom_001",
    workspaceId: "ws_001",
    domain: "webinars.northstarstudio.co",
    subdomain: "northstar",
    isPrimary: true,
    status: "verified",
    sslStatus: "active",
    verificationToken: "webineer-verify-94a8f12c",
    cnameTarget: "cname.webineer.app",
    createdAt: "2026-10-15T12:00:00Z",
    verifiedAt: "2026-10-15T12:05:00Z",
  },
];

const inMemoryBranding: Record<string, WorkspaceBranding> = {
  ws_001: {
    logoUrl: "/brand/logo-primary.svg",
    faviconUrl: "/favicon.svg",
    primaryColor: "#101B35",
    secondaryColor: "#16D6B2",
    fontFamily: "Inter",
    footerText: "Powered by Webineer · Northstar Studio Webinar Portal",
    hidePoweredBy: false,
  },
};

export class CustomDomainService {
  listDomains(workspaceId = "ws_001"): CustomDomain[] {
    return inMemoryDomains.filter((d) => d.workspaceId === workspaceId);
  }

  getBranding(workspaceId = "ws_001"): WorkspaceBranding {
    return inMemoryBranding[workspaceId] || inMemoryBranding.ws_001;
  }

  saveBranding(workspaceId: string, branding: Partial<WorkspaceBranding>): WorkspaceBranding {
    inMemoryBranding[workspaceId] = {
      ...this.getBranding(workspaceId),
      ...branding,
    };
    return inMemoryBranding[workspaceId];
  }

  addDomain(workspaceId: string, domainName: string): { success: boolean; domain?: CustomDomain; error?: string } {
    const cleanDomain = domainName.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!cleanDomain || cleanDomain.length < 4) {
      return { success: false, error: "Please enter a valid domain name (e.g. webinars.yourbrand.com)." };
    }

    // Check collision: prevent another workspace from claiming an already assigned domain
    const existing = inMemoryDomains.find((d) => d.domain === cleanDomain);
    if (existing) {
      if (existing.workspaceId !== workspaceId) {
        return { success: false, error: "This domain is already registered to another Webineer workspace." };
      }
      return { success: true, domain: existing };
    }

    const newDomain: CustomDomain = {
      id: `dom_${Date.now()}`,
      workspaceId,
      domain: cleanDomain,
      isPrimary: inMemoryDomains.filter((d) => d.workspaceId === workspaceId).length === 0,
      status: "pending",
      sslStatus: "pending",
      verificationToken: `webineer-verify-${Math.random().toString(36).substring(2, 10)}`,
      cnameTarget: "cname.webineer.app",
      createdAt: new Date().toISOString(),
    };

    inMemoryDomains.push(newDomain);
    return { success: true, domain: newDomain };
  }

  verifyDomain(domainId: string): { verified: boolean; message: string } {
    const domain = inMemoryDomains.find((d) => d.id === domainId);
    if (!domain) return { verified: false, message: "Domain not found." };

    // In local development adapter mode, simulate DNS verification check
    domain.status = "verified";
    domain.sslStatus = "active";
    domain.verifiedAt = new Date().toISOString();

    return {
      verified: true,
      message: "DNS CNAME and TXT records successfully verified. SSL certificate provisioned in development mode.",
    };
  }

  setPrimary(domainId: string, workspaceId = "ws_001"): boolean {
    const list = this.listDomains(workspaceId);
    list.forEach((d) => {
      d.isPrimary = d.id === domainId;
    });
    return true;
  }

  removeDomain(domainId: string): boolean {
    const idx = inMemoryDomains.findIndex((d) => d.id === domainId);
    if (idx >= 0) {
      inMemoryDomains.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export const customDomainService = new CustomDomainService();
