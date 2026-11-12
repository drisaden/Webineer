# Backup and Restore Guide

## Backup model

The current project does not create or verify a real production backup. The admin package includes a backup-ready operational model, but no live backup infrastructure is connected in the demo repository.

## Recommended PostgreSQL backup flow

Use native Postgres tooling:

```bash
pg_dump -h localhost -U postgres -d Webineer_dev -Fc -f webineer_backup.dump
```

Restore flow:

```bash
pg_restore -h localhost -U postgres -d Webineer_dev webineer_backup.dump
```

## Operational requirements

- verify backups before relying on them
- store backup artifacts in secure, access-controlled storage
- test restore procedures before production use
- keep retention policies explicit
- require admin authorization before any restore operation
- log the action and reason in the audit trail

## Important rule

Do not claim a real backup exists unless it has been created and verified in a configured environment.
