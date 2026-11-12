# Admin Setup Guide

This guide describes the local admin setup for the Webineer administrative panel and its current demo-first implementation. The project intentionally keeps customer-facing app workflows separate from the administration layer.

## Local development

1. Install Node.js and the project dependencies.
2. Copy `.env.example` to `.env.local`.
3. Set a safe bootstrap email for the initial super administrator.
4. Start the app with `npm run dev`.
5. Open the admin panel at `/admin`.

## Initial super admin bootstrap

The project expects this environment variable:

- `INITIAL_SUPER_ADMIN_EMAIL`

Example:

```bash
INITIAL_SUPER_ADMIN_EMAIL=admin@webineer.local
```

This is a bootstrap hint for the admin platform, not a production credential. The app does not create a public self-service admin registration flow. The local demo intentionally keeps bootstrap explicit and documented.

## Admin roles

The current mock implementation includes these role definitions:

- `super-admin`
- `platform-admin`
- `support-admin`
- `finance-admin`
- `technical-admin`

Role permissions live in `src/lib/admin/permissions.ts` and should be enforced server-side in a real backend implementation.

## Admin access model

- `/admin` is the platform control center.
- `/dashboard` remains the customer workspace.
- Admin access must not be inferred from client-side UI state alone.
- Production deployments should add real auth middleware and server-side permission checks.

## Database and infrastructure status

The current repo uses mock repositories, local demo data, and environment-driven configuration. No production database or worker infrastructure is connected by default.

The admin database screens are therefore informational and operationally safe for a demo environment, not production database consoles.

## Required follow-up for production

For real deployment, add:

- secure authentication and admin session enforcement
- server-side RBAC enforcement
- PostgreSQL connection and Prisma migrations
- job queue and worker runtime
- backup verification and alerting
- payment webhook validation and secrets rotation
- real SMTP or email provider configuration
