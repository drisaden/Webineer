import { adminOverviewMetrics, auditEvents, jobQueue, platformIntegrations, platformTransactions, platformUsers, platformWebinars, platformWorkspaces, systemHealth } from "@/data/mock/admin";

export function getPlatformOverview() {
  return adminOverviewMetrics;
}

export function getAdminUsers() {
  return platformUsers;
}

export function getAdminWorkspaces() {
  return platformWorkspaces;
}

export function getAdminWebinars() {
  return platformWebinars;
}

export function getAdminTransactions() {
  return platformTransactions;
}

export function getAdminIntegrations() {
  return platformIntegrations;
}

export function getSystemHealthStatus() {
  return systemHealth;
}

export function getAuditHistory() {
  return auditEvents;
}

export function getJobQueueStatus() {
  return jobQueue;
}

export function getAdminOverviewSummary() {
  return {
    users: getAdminUsers().length,
    workspaces: getAdminWorkspaces().length,
    webinars: getAdminWebinars().length,
    transactions: getAdminTransactions().length,
    integrations: getAdminIntegrations().length,
  };
}
