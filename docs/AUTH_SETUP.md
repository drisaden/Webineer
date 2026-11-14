# Supabase Auth setup

Code: `src/lib/supabase/`, `src/proxy.ts`, `src/server/auth/`, `src/app/(auth)/`, `src/app/auth/`.

## Environment

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`,
`INITIAL_SUPER_ADMIN_EMAIL`. Set `NEXT_PUBLIC_DEMO_MODE=false` in every deployed environment
(it is also ignored on Vercel production). `NEXT_PUBLIC_*` values are inlined at build time:
redeploy after changing them.

## Supabase dashboard

1. **Authentication → URL Configuration**
   - Site URL: `https://webineer.techraacademy.com`
   - Redirect URLs: `https://webineer.techraacademy.com/auth/**` (add `http://localhost:3000/auth/**` for local dev)
2. **Authentication → Providers → Email**: enable email sign-up and **Confirm email**.
3. **Authentication → Emails → Templates**: point links at `/auth/confirm` with the token hash, so they
   work even when opened in a different browser:
   - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard`
   - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
   - Magic link / Invite / Change email: same pattern with `type=magiclink`, `invite`, `email_change`
4. **Authentication → Emails → SMTP Settings**: enable custom SMTP with the Namecheap cPanel mailbox
   (host, port 465 SSL or 587 STARTTLS, username, password, sender). Supabase's built-in sender is
   heavily rate-limited and not meant for production.
5. **Authentication → Sessions / Rate limits**: keep defaults or tighten as needed.

## Behaviour

- Sessions live in HttpOnly, SameSite=Lax cookies (Secure in production). They're refreshed in
  `src/proxy.ts` and verified with `getClaims()`.
- The first sign-in creates the app profile (`users`) and, for new users, a workspace with the
  user as OWNER. Roles never come from user-editable metadata.
- The verified email equal to `INITIAL_SUPER_ADMIN_EMAIL` becomes super admin, once, while none exists.
- Dashboard and API routes check the session on the server. `/admin` requires a platform role and
  returns 404 to everyone else.
