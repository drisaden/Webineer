# Database Guide

## Current implementation status

This repository is not yet connected to a live PostgreSQL database. The project currently uses mock data and local service adapters for demo operations.

The database architecture is intentionally designed to support a future PostgreSQL + Prisma layer without rewriting the customer-facing application.

## Recommended production architecture

- PostgreSQL as the primary relational database
- Prisma ORM for schema generation and migrations
- Repository/service boundaries between UI and persistence
- Server-side access only for database reads, writes, and admin operations
- Explicit migration execution in deployment workflows

## Local configuration

Example environment entry:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/Webineer_dev
```

The app should not commit real credentials. Keep secrets in `.env.local` or a secure environment manager.

## Migration policy

- Generate migrations through the schema tool
- Apply migrations in a controlled deployment pipeline
- Avoid automatic destructive resets in production
- Require explicit admin approval for destructive maintenance actions

## pgAdmin connection example

- Host: localhost
- Port: 5432
- Database: Webineer_dev
- Username: postgres
- Password: set in local environment or secret manager
- SSL: disable for local development, enable depending on production provider requirements

## Operational requirements

The admin database page is a safe status overview for the current mock architecture. It should not be mistaken for a production database console.
