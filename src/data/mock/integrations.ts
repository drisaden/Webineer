import type { Integration } from "@/types";

export const mockIntegrations: Integration[] = [
  { id: "int_001", name: "Mailchimp", type: "email", connected: true, description: "Campaign sequencing and reminder workflows." },
  { id: "int_002", name: "HubSpot", type: "crm", connected: true, description: "Audience syncing and lead enrichment." },
  { id: "int_003", name: "Google Analytics", type: "analytics", connected: true, description: "Traffic attribution and conversion tracking." },
  { id: "int_004", name: "Stripe", type: "payment", connected: false, description: "Offer payments and checkout flows." },
];
