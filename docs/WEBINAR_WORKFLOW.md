# Webinar creation workflow

The nine-section, non-linear webinar setup lives at `/dashboard/webinars/new` (new) and
`/dashboard/webinars/[id]/setup` (existing webinars, deep-linkable with `?section=`).

## Sections

Configuration · Schedules · Registration · Notifications · Integrations · Thank You · Live · Replay · Finish

Any section can be opened at any time from the timeline. Completion is computed from saved
data by `evaluateWorkflow()` (`src/lib/webinar-workflow/validation.ts`), which both the
client and the publish endpoint use:

| State | Meaning |
| --- | --- |
| Completed | Section is valid and saved |
| Incomplete | Not configured enough yet, or has unsaved changes |
| Attention required | Started, but contains invalid or conflicting settings |

Publishing is blocked server-side until there are no error-level issues.

## Data model

One optional field on the existing `Webinar`: `workflow?: WebinarWorkflowConfig`
(`src/types/webinar-workflow.ts`). No new tables. For Prisma/Supabase this maps to a single
`jsonb` column on `webinars`. `applyWorkflowToWebinar()` keeps the existing top-level fields
(title, type, status, schedule, videoSource, automatedSettings) in sync so listing, detail,
analytics and admin pages are unchanged. Legacy webinars get a workflow derived from their
existing fields the first time they are opened in the editor.

## Persistence & concurrency

- All writes go through `src/services/webinar-workflow-service.ts` → `mockWebinarRepository`.
- `PATCH /api/webinars/[id]` accepts only the sections that changed. Each section records the
  config version it was last changed at; editing a section that changed after your base
  version returns `409` instead of overwriting it.
- The editor autosaves (debounced), saves on section change, serialises requests (no duplicate
  submissions) and warns before leaving with unsaved changes.
- Local dev: the mock store is snapshotted to `.webineer-data/mock-store.json` (registered in
  `src/instrumentation.ts`). Disabled on Vercel or with `WEBINEER_MOCK_PERSISTENCE=memory`.

## Registration publishing methods

All four use one endpoint, `POST /api/public/register`, and one attendee store:

1. Hosted page — `/w/[slug]`
2. Inline embed — `<iframe src="/embed/[publicId]?source=inline">`
3. Popup embed — button + `/webineer-popup.js` (no SDK; opens the same embed in a modal)
4. Registration button — plain `<a>` to the hosted page with `?source=button`

Security: snippets contain only the public id and origin; the embed page receives a
public-only view model (`buildPublicView`); the API rejects cross-site browser POSTs, validates
everything server-side against the stored configuration, rate-limits per IP and per webinar,
uses a honeypot and minimum fill time, de-duplicates by email without leaking access keys,
and enforces capacity, registration windows and the optional embed domain allowlist.
`/embed/*` is frameable by any site; every other route sends `X-Frame-Options: SAMEORIGIN`.

## Access rules

- Personal links: `?r=<registrationId>&k=<accessKey>` (constant-time compared).
- Room (`/room/[slug]`): access setting, verified payment for paid webinars, entry window,
  late-join cutoff. Entering marks the registration as attended.
- Replay (`/replay/[slug]`): disabled → unavailable even by direct URL; access (all / attended /
  paid / anyone), availability and expiry are enforced on the server.
- Host previews use `?preview=host` / `?preview=1` and require `canManageWebinar()`.

## Notifications

Confirmation and host emails are sent on registration through the existing email provider.
Reminders and follow-ups are sent by `GET /api/cron/notifications` (requires
`Authorization: Bearer $CRON_SECRET`), idempotent via keys stored on the webinar. Schedule it
with Vercel Cron (Pro plans allow sub-daily schedules) or any external scheduler.

## Known dependencies (not faked)

- Authentication is the demo session (`src/lib/auth/demo-session.ts`); swap in real auth there.
- Real email delivery needs SMTP/provider credentials; otherwise emails go to the dev log.
- Real payments need `FLUTTERWAVE_SECRET_KEY` (or Paystack); otherwise payments are simulated
  and labelled as test mode.
- Chat, Q&A and polls need a real-time service and are shown as unavailable.
- Rate limiting and analytics events are in-memory; use a shared store on multi-instance hosts.
