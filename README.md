# Webineer

Webineer is a webinar automation, management, and marketing SaaS built around external video sources, automated attendee journeys, and repeatable webinar operations. The product is designed for creators, educators, teams, and businesses that want to run live, scheduled, evergreen, and automated webinar experiences without forcing their content to live entirely inside a single-host platform.

## Product overview

Webineer helps teams schedule webinars, automate reminders, manage registrations, sell paid access, connect integrations, and review operational metrics. The platform keeps the external video provider separate from the attendee experience, which makes it usable with YouTube, Vimeo, Wistia, custom embeds, and pre-recorded content while preserving a branded workflow around registrations and follow-up.

## Feature set

- Webinar schedules and different delivery models
- Automated webinar flows and reminder sequences
- Timeline-based video interactions and CTAs
- Email template library and local delivery logging
- Paid ticketing and monetization settings
- Payment adapter layer with test-mode design
- Analytics summaries, exports, and revenue reporting
- Domain verification and branding configuration
- Contact and audience segmentation workflows
- Team and workspace role structure

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React
- Zod and React Hook Form

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Development commands

```bash
npm run lint
npm run typecheck
npm run build
```

## Environment configuration

Copy the sample environment file and update the values you need:

```bash
cp .env.example .env.local
```

The app remains safe to run in local development without setting any external credentials. If you do not configure SMTP or payment keys, the system will use safe mock/test behaviour and display clear local-only status.

## Optional provider setup

- SMTP: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`
- Paystack: set `PAYSTACK_SECRET_KEY`
- Flutterwave: set `FLUTTERWAVE_SECRET_KEY` and `FLUTTERWAVE_SECRET_HASH`
- Database: set `DATABASE_URL` or `POSTGRES_URL` for future server-side persistence

## Payment test mode

The project ships with simulated test providers. This keeps local development zero-cost and avoids requiring live payment credentials. A real provider can be activated by adding environment variables and using the provider adapter pattern.

## Email configuration

Email sending is abstracted behind the provider layer. By default the local development adapter records message activity in the app and keeps it visible in the dashboard.

## Database configuration

The current repository uses mock repositories and in-memory adapters to keep the project runnable without paid infrastructure. A real database adapter can replace the in-memory store behind the existing service interfaces.

## Deployment notes

Production deployment should provide:

- secure server-side environment variables
- real worker or scheduler infrastructure for automation handling
- verified payment webhook endpoints
- DNS and SSL support for custom domains
- server-side authorization and audit logging

## Known limitations

- This is not a production-grade authentication system by itself.
- Real email delivery and payment processing require provider configuration.
- Custom domains still require external DNS and hosting configuration.
- External provider playback metrics are limited by the player APIs and browser security model.

## Notes

This repository follows the project rules in agent.md and the GitHub Copilot instructions under .github/copilot-instructions.md.
