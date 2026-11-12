export type AdminRole =
  | "super-admin"
  | "platform-admin"
  | "support-admin"
  | "finance-admin"
  | "technical-admin";

export type AdminPermission =
  | "admin.dashboard.view"
  | "admin.users.view"
  | "admin.users.manage"
  | "admin.users.suspend"
  | "admin.workspaces.view"
  | "admin.workspaces.manage"
  | "admin.webinars.view"
  | "admin.webinars.manage"
  | "admin.transactions.view"
  | "admin.transactions.manage"
  | "admin.subscriptions.manage"
  | "admin.integrations.manage"
  | "admin.settings.manage"
  | "admin.database.view"
  | "admin.database.maintenance"
  | "admin.jobs.manage"
  | "admin.audit.view"
  | "admin.admins.manage";

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  "super-admin": "Super Admin",
  "platform-admin": "Platform Admin",
  "support-admin": "Support Admin",
  "finance-admin": "Finance Admin",
  "technical-admin": "Technical Admin",
};

export const ADMIN_PERMISSION_MATRIX: Record<AdminRole, AdminPermission[]> = {
  "super-admin": [
    "admin.dashboard.view",
    "admin.users.view",
    "admin.users.manage",
    "admin.users.suspend",
    "admin.workspaces.view",
    "admin.workspaces.manage",
    "admin.webinars.view",
    "admin.webinars.manage",
    "admin.transactions.view",
    "admin.transactions.manage",
    "admin.subscriptions.manage",
    "admin.integrations.manage",
    "admin.settings.manage",
    "admin.database.view",
    "admin.database.maintenance",
    "admin.jobs.manage",
    "admin.audit.view",
    "admin.admins.manage",
  ],
  "platform-admin": [
    "admin.dashboard.view",
    "admin.users.view",
    "admin.users.manage",
    "admin.users.suspend",
    "admin.workspaces.view",
    "admin.workspaces.manage",
    "admin.webinars.view",
    "admin.webinars.manage",
    "admin.transactions.view",
    "admin.integrations.manage",
    "admin.settings.manage",
    "admin.audit.view",
  ],
  "support-admin": [
    "admin.dashboard.view",
    "admin.users.view",
    "admin.workspaces.view",
    "admin.webinars.view",
    "admin.audit.view",
  ],
  "finance-admin": [
    "admin.dashboard.view",
    "admin.transactions.view",
    "admin.transactions.manage",
    "admin.subscriptions.manage",
    "admin.audit.view",
  ],
  "technical-admin": [
    "admin.dashboard.view",
    "admin.database.view",
    "admin.database.maintenance",
    "admin.jobs.manage",
    "admin.integrations.manage",
    "admin.audit.view",
    "admin.settings.manage",
  ],
};

export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  return ADMIN_PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

export function getBootstrapAdminEmail(): string {
  return process.env.INITIAL_SUPER_ADMIN_EMAIL ?? "admin@webineer.local";
}

export function getBootstrapStatus() {
  return {
    configured: Boolean(process.env.INITIAL_SUPER_ADMIN_EMAIL),
    email: getBootstrapAdminEmail(),
  };
}
