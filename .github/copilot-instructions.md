# Copilot instructions for Webineer

Before making significant implementation changes, read the root agent.md file and follow the project conventions established there.

## Required workflow

1. Read agent.md before broad changes.
2. Preserve the existing architecture and design system.
3. Prefer small, reusable, clearly scoped changes.
4. Keep the app aligned with the product foundation for Phase 01.
5. Do not add paid or mandatory external services.
6. Keep mock repositories and provider abstractions replaceable.
7. Respect accessibility, responsive behavior and type safety.
8. Document architecture changes when they affect the product foundation.

## Product guardrails

- Webineer is a webinar automation and marketing SaaS platform.
- The product is not a generic AI dashboard or a video-hosting app.
- Video provider integrations must remain modular.
- Embedded content and landing-page rendering must stay separate.
- Authentication in frontend-only development mode must be clearly marked as demo-only.
- Use realistic sample data and do not present mock metrics as real analytics.

## Preferred structure

- Reuse shared components in src/components
- Keep domain models in src/types
- Keep mock repositories in src/data/mock and src/services
- Place app pages under src/app
- Centralize brand tokens in CSS variables and shared config

## Important constraints

- Do not rewrite the foundation just to add a feature.
- Do not pretend a demo login is production-grade security.
- Do not fabricate real customer stats or testimonials.
- Do not add paid dependencies or external APIs as required local dependencies.

## Phase 03 update

- Keep automation, payment, email, and analytics work aligned with the existing mock/adaptor architecture.
- Prefer local development adapters over fake production claims.
- Distinguish simulated and externally configured provider states clearly in the UI and documentation.
- Keep external video-first webinar flows intact while adding automation and commercial features.
- Do not present Phase 03 mock data as real production analytics.

## Phase 04 update

- Add an admin-only platform control layer without merging it into the customer dashboard experience.
- Keep admin authorization scoped by role and permission, with the current app clearly marked as demo-only when no server-side auth exists.
- Preserve the customer dashboard while adding separate administration routes, navigation, and operational workflows.
- Keep real database, backup, and infrastructure operations clearly documented as future or external configuration rather than silently connected.
- Do not expose secrets, database credentials, or payment keys in the browser UI or logs.
- Treat the admin panel as an operational foundation and safety boundary, not a public user dashboard masquerading as production infrastructure.
