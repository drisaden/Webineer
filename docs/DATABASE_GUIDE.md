# Database Guide

## Status

Prisma 7 + Supabase PostgreSQL. Schema: `prisma/schema.prisma`. Migrations: `prisma/migrations/`.
The UI still reads the mock repository until Phase 3 swaps in Prisma-backed repositories.

## Connections

| Variable | Used by | Supabase connection |
| --- | --- | --- |
| `DATABASE_URL` | App runtime (Vercel) via `src/server/db/prisma.ts` | Transaction pooler, port 6543 |
| `DIRECT_URL` | `prisma migrate` via `prisma.config.ts` | Direct / session pooler, port 5432 |
| `DATABASE_SSL_CA` | Optional verified TLS | Supabase CA certificate (PEM or base64) |

## Commands

```bash
npm install                 # also runs prisma generate (postinstall)
npm run db:migrate:deploy   # apply migrations (production / Supabase)
npm run db:migrate:dev      # create a new migration after editing the schema (dev only)
npm run db:status
TEST_DATABASE_URL=postgresql://.../webineer_test npm run test:db   # integration tests
```

Run `db:migrate:deploy` as an explicit release step (not inside `next build`), so preview
deployments never migrate the production database.

## Security model

- Prisma uses a privileged role and **bypasses RLS**. Tenant isolation is enforced in
  `src/server/auth/authorize.ts` (`requireOrgPermission`, `requireTenantWebinar`, `tenantWhere`).
- Child tables reference webinars through `(webinar_id, organization_id)`, so Postgres rejects
  rows whose organization differs from their webinar's.
- RLS is enabled on every table with no policies, so Supabase's public Data API (anon /
  authenticated keys) cannot read or write application data.
- Platform admins live in `platform_admins`, separate from organization memberships. They are
  created only by an existing super admin (no self-grants) or the one-time
  `INITIAL_SUPER_ADMIN_EMAIL` bootstrap.
- Ticket payments and subscription payments share the `payments` ledger but are separated by a
  CHECK constraint on `purpose`.

## Migration policy

- Never edit an applied migration. Add a new one.
- Avoid destructive resets in production. Back up before risky migrations.
