# Webineer Product Constitution

## 1. Project identity

- Product name: Webineer
- Product category: Webinar automation, management and marketing SaaS
- Product purpose: Help teams, educators and businesses create branded webinar experiences around external video sources, automate audience engagement and convert attendance into revenue or action.
- Target audience: Course creators, coaches, consultants, educators, agencies, corporate trainers, event organizers and businesses running product demos and online presentations.
- Core product philosophy: Bring your content. Build your experience. Automate your audience.

## 2. Architecture and technology stack

- Frontend: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS with centralized CSS variables and brand tokens
- UI patterns: Reusable component library with consistent spacing, typography and interaction states
- Form handling: React Hook Form + Zod
- Data layer: Typed domain models and mock repositories behind provider-agnostic interfaces
- Storage: Development-safe localStorage adapters for demo preferences and mocked session state
- Charts: Recharts for dashboards and trend visuals
- Dependencies: Free, open-source and optional for local development only

## 3. Folder organization

```text
/
├── agent.md
├── README.md
├── .github/
│   └── copilot-instructions.md
├── public/
│   ├── brand/
│   ├── images/
│   └── icons/
├── src/
│   ├── app/
│   │   ├── (marketing)
│   │   ├── (auth)
│   │   ├── dashboard/
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── branding/
│   │   ├── dashboard/
│   │   ├── layout/
│   │   ├── shared/
│   │   └── ui/
│   ├── data/
│   │   └── mock/
│   ├── features/
│   │   ├── analytics/
│   │   ├── audience/
│   │   ├── landing-pages/
│   │   ├── settings/
│   │   └── webinars/
│   ├── hooks/
│   ├── lib/
│   │   ├── constants/
│   │   ├── storage/
│   │   ├── utils/
│   │   └── validations/
│   ├── providers/
│   ├── services/
│   ├── types/
│   └── data/
└── .env.example
```

## 4. Brand identity rules

### Brand palette
- Midnight Navy: #101B35
- Deep Navy: #17294B
- Electric Teal: #16D6B2
- Bright Teal: #0FC7A6
- White: #FFFFFF
- Background: #F7F9FC
- Surface: #FFFFFF
- Muted Surface: #EEF2F7
- Border: #E4E9F1
- Primary Text: #172033
- Secondary Text: #64748B
- Success: #16A36A
- Warning: #E7A23B
- Error: #DC5353
- Information: #3985DB

### Typography
- Use Inter or an equivalent modern sans font stack.
- Maintain a consistent scale for headings, body text, labels, metrics and metadata.
- Avoid overly decorative or promotional typography.

### Design principles
- Clear visual hierarchy
- Minimal clutter
- Excellent contrast and readability
- Clear information architecture
- Responsive layout behavior
- Modest color usage that highlights actions without excessive gradients
- Consistent spacing and component structure

### Logo and assets
- Keep logo assets in public/brand
- Support primary, icon-only, light background and dark background variants
- Keep brand names, paths and tokens centralized through shared constants and CSS variables

## 5. Domain model and architecture rules

### Domain models
At minimum, use the following types:
- User
- Workspace
- Webinar
- WebinarSchedule
- WebinarStatus
- WebinarType
- VideoSource
- VideoProvider
- Registration
- Attendee
- LandingPage
- LandingPageSection
- EmbedConfiguration
- WebinarInteraction
- Poll
- Question
- EmailCampaign
- AnalyticsSummary
- Integration

### Video provider architecture
- Video providers must be modular and not tightly coupled to the webinar entity.
- Use a provider abstraction to support YouTube, Vimeo, Wistia, custom iframe, custom URL, uploaded video and external live streams.
- Each provider exposes its own capabilities rather than assuming identical playback controls or embed behavior.
- Provider metadata must include identificaton, validation, ID extraction and embed configuration.

### Embed abstraction
- Landing page embeds must be modeled separately from the webinar content layer.
- Supported conceptual embed types: URL, iframe, HTML, third-party widget, video, image, audio, form, calendar and custom content.
- Custom HTML and iframe content must remain sanitized and sandboxed in future implementations.

### Service boundaries
- Domain logic stays separate from UI presentation.
- Data access should live behind repository and adapter interfaces.
- Mock data is a temporary adapter layer, not a permanent implementation strategy.
- Storage logic should be abstracted so real persistence can replace demo storage later.

## 6. Coding and UI conventions

### TypeScript rules
- Use strict TypeScript with explicit models and interfaces.
- Avoid any: unless it is genuinely untyped external data, and prefer narrow, typed interfaces.
- Use shared types and centralized constants rather than repeated object literals across the app.

### Component rules
- Reusable UI should live in src/components
- Reuse shared primitives rather than duplicating page-level implementations
- Prefer clear names like Sidebar, AppHeader, DashboardCard, WebinarListTable, ContentShell
- Keep component responsibilities focused and minimal

### File naming conventions
- Use kebab-case for file names and PascalCase for exported React components.
- Keep page files colocated with route paths under src/app
- Place reusable UI in src/components/ui and shared layout patterns in src/components/layout

### Accessibility and UX
- Every interactive element needs a clear label and visible focus state.
- Use semantic HTML, keyboard-accessible controls and assistive text where needed.
- Keep forms clear and readable with inline validation messaging.
- Ensure responsive touch targets for mobile interactions.

### Security principles
- Do not hardcode credentials or production keys.
- Do not suggest fake integrations as real.
- Keep external data integrations modular and environment-driven.
- Never execute arbitrary JavaScript from untrusted custom content without sanitization and sandboxing.

## 7. Development restrictions

- No mandatory paid APIs
- No unnecessary third-party dependencies
- No paid video hosting requirement
- No hardcoded credentials
- No fake integrations disguised as live features
- No misleading success messaging or fabricated analytics
- No architecture rewrites that break the established Phase 01 foundation

## 8. Three-phase roadmap

### Phase 01: Foundation
- Complete branding and design system
- App shell and route architecture
- Dashboard foundation
- Authentication experience with demo-mode adapter
- Reusable component library
- Domain models and provider abstractions
- Mock repositories and demo data
- Agent and docs setup

### Phase 02: Core webinar functionality
- Webinar creation and management
- External video provider integrations
- YouTube and Vimeo embedding
- Registration page builder and drag-and-drop sections
- Viewing room, polls and Q&A
- Attendee management and scheduling

### Phase 03: Automation and commercial features
- Automated webinars and replay experiences
- Email sequences and reminders
- Time-based offers and CTAs
- Payment and checkout flows
- Analytics, conversion tracking and domains
- Advanced integrations and optimization

## 9. Copilot working instructions

Every time a new development task is initiated:
1. Read agent.md.
2. Inspect the existing implementation.
3. Understand current conventions.
4. Identify affected modules.
5. Plan before making extensive changes.
6. Preserve working functionality.
7. Avoid unnecessary rewrites.
8. Implement the requested task.
9. Test the implementation.
10. Update documentation when architecture changes.

## 10. Required output philosophy

The app must feel like a trustworthy commercial SaaS platform, not a generic AI dashboard template. Every section should be purposeful, readable and production-minded.

## 11. Current implementation status

This repository is being built as Phase 01 of the Webineer platform. The goal is to create a high-quality foundation that is ready for webinar-functionality work in Phase 02 without needing to rebuild the shell, architecture or design system.

## 12. Phase 03 architecture addendum

### Automation architecture

Webineer supports event-driven webinar automations through a mock execution engine that can match workflow triggers to action steps without requiring a paid job runner. Automations are stored as typed workflow definitions with enabled state, execution history, and idempotency protection. The engine supports sends, delays, tags, notifications, and webhook dispatch patterns while keeping provider integrations behind modular adapters.

### Scheduling and recurring sessions

Live, evergreen, recurring, on-demand, and automated webinar objects share the same schedule model and optional recurring configuration. The platform distinguishes between scheduled live sessions and pre-recorded automated experiences. For local development, simulation is intentionally limited to a controlled scheduling horizon and deterministic in-memory data rather than generating unbounded future records.

### Background job adapter

Production automation should be backed by a server-side worker or queue. This implementation ships with a local adapter pattern that keeps workflow definitions and execution records in memory. The scheduler interface is intentionally pluggable so a production queue can replace the development adapter without rewriting the application layer.

### Time-based video interactions

The platform maintains a timeline event model for recorded or delayed webinar experiences. Works are provider-aware: if the external player exposes playback time, events can be synchronized; if not, the product falls back to fixed session-time or host-triggered actions with clear limitations and no fake playback claims.

### Email providers

Email delivery is abstracted behind a provider interface. The default development adapter records outbound mail in an in-memory log and surfaces it in the dashboard. SMTP connection details are environment-driven and do not run without configuration. Real delivery only occurs when a valid provider is configured.

### Payment gateways

Payment configuration keeps provider logic separate from the UI. The demo environment uses simulated test-mode transactions by default, while Paystack and Flutterwave adapters remain available when credentials are supplied. Payment verification and webhooks are considered server-side concerns and should never trust browser-only callbacks.

### Webhook handling

Outgoing webhooks are signed, include timestamps and event IDs, and validate destination URLs against private-network protections to reduce SSRF risk. Delivery history is retained with status and retry metadata for inspection.

### Analytics event schema

Analytics events are recorded with typed event names, timestamps, source metadata, and safe device info. Dashboard views distinguish between directly measured, calculated, estimated, and unavailable metrics so the application does not claim unsupported accuracy.

### Custom domains and white-labeling

Domain configuration remains intentionally honest. The app can generate DNS instructions and simulate verification in local development, but actual SSL and hosting provisioning need real infrastructure. Brand settings are limited to safe configuration fields and are kept separate from trusted app code.

### Workspace and RBAC

Workspace ownership, roles, and permissions are represented by typed models and local service logic. Real production enforcement should happen on the server or service layer, and access must remain workspace-isolated even if a client mutates a URL parameter.

### Billing entitlements

The project includes a local billing adapter and entitlement model, allowing plans to be configured without requiring a paid SaaS billing backend. These entitlements remain separate from host payment flow integration and must not be confused with webinar checkout.

### Database adapter strategy

The repository layer remains mock-first for local demos but is organized behind interfaces so a real PostgreSQL-compatible or Supabase-backed database can later replace the in-memory store without broad frontend changes.

### Environment variables

The project expects local environment variables for optional providers. Secrets are never committed to source control. Production configuration must be explicitly set and validated before enabling external adapters.

### Security requirements

The application maintains a clearly labelled demo-authentication boundary, required safeguards for payment verification and webhook validation, and content restrictions around embeds. Input and config validation remain critical for future production deployment.

### Production deployment requirements

The app can run locally without paid services, but real deployment requires a host that can manage environment variables, custom domains, and server-side operations. Background jobs, verified payment webhooks, and mail delivery should be run on a secure application server or worker infrastructure.

### Known limitations

- No real database migrations are configured yet.
- Email sending remains local by default unless SMTP or a provider is configured.
- Payment flows are simulated in development mode unless secrets are supplied.
- Webhook delivery remains local and adapter-based until an external worker infrastructure is configured.
- Provider-specific playback metrics remain limited by the embedded player APIs and browser restrictions.

This addendum should be read together with the product constitution and the Phase 01/02 architecture rules.

## 13. Phase 04 super admin architecture

### Administrative separation

The customer dashboard remains at `/dashboard`. The platform administration experience is a completely separate control plane at `/admin`. This separation prevents UI-only role switching from granting access to platform operational features. The admin shell uses a dedicated navigation and layout, and platform access is expected to be enforced on the server in production.

### Admin role model

Webineer defines a permission-first role system with platform-level roles for super admin, platform admin, support admin, finance admin, and technical admin. These roles are documented in `src/lib/admin/permissions.ts` and should remain centralized rather than hardcoded in page components. The role matrix distinguishes between customer-facing administrative access and sensitive infrastructure or financial tasks.

### Permission architecture

The system uses explicit admin permissions such as `admin.dashboard.view`, `admin.users.manage`, `admin.database.view`, `admin.jobs.manage`, and `admin.admins.manage`. This enables safe authorization checks without relying on a frontend-only condition. A production backend should enforce these permissions on service boundaries and API routes.

### Admin route structure

The platform control plane includes dedicated routes for overview, users, workspaces, webinars, registrations, transactions, subscriptions, integrations, email, announcements, system health, database status, maintenance, audits, and settings. Each route is implemented as a functional admin page with demo-safe placeholder data and clear operational labels.

### Service boundaries

The admin system uses mock data and local platform service access in the current repository. Real database services, backup verification, payment reconciliation, and worker health checks are intentionally documented as external and not silently connected. The architecture remains replaceable and does not force a full rewrite of the customer application.

### Database and infrastructure architecture

The project is intentionally staged to support PostgreSQL, Prisma, background workers, storage providers, and email/payment integration adapters without turning the frontend into a database console. The admin database and system health screens are informational and monitoring-focused, while the docs clearly state they do not imply a live production connection.

### Bootstrap process

The initial super administrator bootstrap is defined through the environment variable `INITIAL_SUPER_ADMIN_EMAIL`. This keeps the first admin identity explicit and auditable without hardcoding secrets or creating a public self-serve admin promotion route. Production authentication should add a secure sign-in flow, MFA support for sensitive actions, and server-side admin checks.

### Backup and restoration policy

Backups are documented as a required operational process rather than a fabricated or simulated state. Any restore operation should be explicitly authorized, verified, and logged. The repo documentation enforces that no real restore or destructive operation occurs without a proper technical workflow.

### Audit logging

Sensitive platform actions should be recorded with actor, target, reason, timestamp, and result. The admin audit log screens document the design without exposing secrets or token values. This keeps the platform traceable even though the current repository is front-end-first and mock-data driven.

### Security rules

- Do not expose database credentials, API keys, or payment secrets in the browser.
- Do not rely on URL changes or frontend state alone to protect admin routes.
- Do not create a public self-service admin account creation flow.
- Use environment variables or secure secret managers for production configuration.
- Keep admin actions audit-loggable and reversible where possible.

### Known infrastructure limitations

- No production PostgreSQL database is connected yet.
- No live worker scheduler is required for demo mode.
- No live email or payment providers are required to run the project locally.
- Database backup verification is documented but not yet activated in the repository.
- Authentication and RBAC remain demo-safe until a real server-side auth layer is added.

This addendum should be read together with the project constitution, secure admin requirements, and the Phase 03 architecture guidance.
