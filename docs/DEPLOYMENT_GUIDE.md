# Deployment Guide

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

- customer app: `/`
- dashboard: `/dashboard`
- admin panel: `/admin`

## Production deployment checklist

1. Choose a managed production host.
2. Configure secure environment variables.
3. Provision PostgreSQL and add DATABASE_URL.
4. Configure SMTP or an email provider.
5. Configure payment providers and webhook verification.
6. Set up object storage and worker background jobs.
7. Run schema migrations from a secure deployment pipeline.
8. Add HTTPS and custom domains.
9. Configure backups and monitoring.
10. Verify admin panel access and audit logs.

## Notes

This repository remains intentionally mock-first and is not yet connected to a live production database or external provider ecosystem. The deployment path is documented as a future infrastructure step, not a current connected setup.
