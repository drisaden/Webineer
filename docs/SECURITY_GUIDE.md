# Security Guide

## Current security posture

This project is intentionally demo-first and does not claim production-grade security. The customer dashboard and admin panel are separated by route structure and a permission model, but they are not backed by a real server-side auth layer in the current codebase.

## Required production hardening

- real authentication provider and secure session handling
- server-side permission checks on every admin API or service action
- workspace-level isolation checks
- rate limiting on admin login and sensitive endpoints
- CSRF protection for state-changing actions
- input validation and sanitization
- secret handling through environment variables or a secure vault
- masked secret display in admin UI
- complete audit logging for privileged actions

## Sensitive data rules

Never log or expose:

- payment secrets
- SMTP passwords
- API keys
- admin session tokens
- user passwords
- production database credentials

## Admin action requirements

High-risk admin operations should require:

- explicit reason tracked in audit logs
- recorded user identity
- confirmation before destructive actions
- server-side verification before status changes

## Security disclaimers

The admin system in this repository is an operational foundation and mock-data interface rather than a production-grade control plane. It should be treated as a secure architecture template, not as a completed production security system.
