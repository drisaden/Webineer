# Admin Permission Matrix

| Role | Key capabilities |
| --- | --- |
| Super Admin | Full platform access, admin management, settings, integrations, database status, job review, audit access |
| Platform Admin | Manage users, workspaces, webinars, registrations, content, and operational oversight |
| Support Admin | Review customer records, support cases, webinar configuration, and account status |
| Finance Admin | Review transactions, subscriptions, payment reconciliation, and financial records |
| Technical Admin | Review health checks, job queues, database status, migrations, and approved maintenance tasks |

## Permission summary

- `admin.dashboard.view`
- `admin.users.view`
- `admin.users.manage`
- `admin.users.suspend`
- `admin.workspaces.view`
- `admin.workspaces.manage`
- `admin.webinars.view`
- `admin.webinars.manage`
- `admin.transactions.view`
- `admin.transactions.manage`
- `admin.subscriptions.manage`
- `admin.integrations.manage`
- `admin.settings.manage`
- `admin.database.view`
- `admin.database.maintenance`
- `admin.jobs.manage`
- `admin.audit.view`
- `admin.admins.manage`

The permission model is defined in `src/lib/admin/permissions.ts` and should be enforced server-side in a full backend implementation.
