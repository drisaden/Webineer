/** What a plan unlocks inside the live attendee room. */
export interface LiveEntitlements {
  /** Public chat. */
  chat: boolean;
  /** "N watching" counter. */
  viewerCount: boolean;
  /** Floating emoji reactions. */
  reactions: boolean;
  /** Attendee questions that the host can answer. */
  qa: boolean;
  /** Live polls. */
  polls: boolean;
  /** Pinned message and host announcement banner. */
  announcements: boolean;
  /** Slow mode, locking chat and muting attendees. */
  moderationTools: boolean;
  /** Download chat and Q&A as a CSV file. */
  transcriptExport: boolean;
}

export interface PlanEntitlements {
  live: LiveEntitlements;
  maxWebinars: number;
  maxRegistrantsPerWebinar: number;
  allowEvergreenAutomated: boolean;
  allowCustomDomains: boolean;
  allowPaidWebinars: boolean;
  allowAdvancedAutomations: boolean;
  maxTeamMembers: number;
  pageBuilder: { maxElements: number; advancedElements: boolean; allTemplates: boolean };
  transactionFeePercent: number; // For host ticket payments
}

export const SAAS_PLANS: Record<"free" | "starter" | "professional" | "business", {
  name: string;
  priceMonthly: number;
  currency: string;
  description: string;
  entitlements: PlanEntitlements;
}> = {
  free: {
    name: "Free Sandbox",
    priceMonthly: 0,
    currency: "USD",
    description: "Explore the platform, test external video embeds, and run simple live webinars.",
    entitlements: {
      live: { chat: true, viewerCount: true, reactions: false, qa: false, polls: false, announcements: false, moderationTools: false, transcriptExport: false },
      maxWebinars: 3,
      maxRegistrantsPerWebinar: 50,
      allowEvergreenAutomated: false,
      allowCustomDomains: false,
      allowPaidWebinars: false,
      allowAdvancedAutomations: false,
      maxTeamMembers: 1,
      pageBuilder: { maxElements: 12, advancedElements: false, allTemplates: false },
      transactionFeePercent: 10,
    },
  },
  starter: {
    name: "Starter Creator",
    priceMonthly: 19,
    currency: "USD",
    description: "For creators and educators scaling registration funnels with email automation.",
    entitlements: {
      live: { chat: true, viewerCount: true, reactions: true, qa: true, polls: false, announcements: false, moderationTools: false, transcriptExport: false },
      maxWebinars: 10,
      maxRegistrantsPerWebinar: 300,
      allowEvergreenAutomated: true,
      allowCustomDomains: false,
      allowPaidWebinars: true,
      allowAdvancedAutomations: false,
      maxTeamMembers: 2,
      pageBuilder: { maxElements: 30, advancedElements: true, allTemplates: true },
      transactionFeePercent: 5,
    },
  },
  professional: {
    name: "Professional Growth",
    priceMonthly: 49,
    currency: "USD",
    description: "Full automation suite with evergreen sessions, paid tickets, and custom domains.",
    entitlements: {
      live: { chat: true, viewerCount: true, reactions: true, qa: true, polls: true, announcements: true, moderationTools: true, transcriptExport: false },
      maxWebinars: 50,
      maxRegistrantsPerWebinar: 1500,
      allowEvergreenAutomated: true,
      allowCustomDomains: true,
      allowPaidWebinars: true,
      allowAdvancedAutomations: true,
      maxTeamMembers: 5,
      pageBuilder: { maxElements: 60, advancedElements: true, allTemplates: true },
      transactionFeePercent: 2.5,
    },
  },
  business: {
    name: "Business & Agency",
    priceMonthly: 99,
    currency: "USD",
    description: "Unlimited webinars, dedicated webhook bandwidth, and team role collaboration.",
    entitlements: {
      live: { chat: true, viewerCount: true, reactions: true, qa: true, polls: true, announcements: true, moderationTools: true, transcriptExport: true },
      maxWebinars: 9999,
      maxRegistrantsPerWebinar: 10000,
      allowEvergreenAutomated: true,
      allowCustomDomains: true,
      allowPaidWebinars: true,
      allowAdvancedAutomations: true,
      maxTeamMembers: 25,
      pageBuilder: { maxElements: 150, advancedElements: true, allTemplates: true },
      transactionFeePercent: 1.5,
    },
  },
};

let currentWorkspacePlan: "free" | "starter" | "professional" | "business" = "professional";

export class BillingEntitlementService {
  getCurrentPlan() {
    return {
      planKey: currentWorkspacePlan,
      ...SAAS_PLANS[currentWorkspacePlan],
    };
  }

  setWorkspacePlan(plan: "free" | "starter" | "professional" | "business") {
    currentWorkspacePlan = plan;
  }

  getUsageMetrics() {
    return {
      webinarsUsed: 4,
      webinarsLimit: SAAS_PLANS[currentWorkspacePlan].entitlements.maxWebinars,
      registrantsThisMonth: 824,
      teamMembersCount: 4,
      teamMembersLimit: SAAS_PLANS[currentWorkspacePlan].entitlements.maxTeamMembers,
      customDomainsActive: 1,
    };
  }
}

export const billingService = new BillingEntitlementService();
