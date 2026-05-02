# Google OAuth + JWT Verification — Design

**Date:** 2026-05-02
**Branch:** `feat/google-oauth`
**Phase mapping:** Phase 3.4 of the master implementation plan.
**Out of scope:** persistence (Phase 4 — separate PR).

## Problem

Both Edge Functions (`/ocr-translate`, `/chat`) currently run with `--no-verify-jwt`, meaning anyone with their URL can call them within the rate limits. The frontend has no auth — refresh blanks the state, there is no user identity, and the database schema in Phase 3 sits unused because the RLS policies all reference `auth.uid()`.

## Goal

Wire Google sign-in into the frontend, gate the upload page behind it, and redeploy both Edge Functions with JWT verification on. Establish the auth foundation that Phase 4 (history persistence) will ride on.

## Architecture

Auth lives entirely in Supabase Auth. The frontend uses `@supabase/supabase-js`'s built-in browser session (PKCE flow, `localStorage` token persistence, automatic refresh). The user never sees a Supabase domain except for the OAuth callback hop.

Every browser-to-Edge-Function request carries `Authorization: Bearer <session.access_token>` instead of the anon key. Both functions are redeployed without `--no-verify-jwt`; the Supabase Edge runtime verifies the JWT before invoking our handler, so an invalid token produces a 401 our code never sees.

All upload + chat functionality requires auth. Unauthenticated users see only `/sign-in`.

## Components

```
src/lib/supabase/
  browserClient.ts          singleton @supabase/supabase-js client
  browserClient.test.ts     env required, idempotent singleton

src/lib/auth/
  signIn.ts                 signInWithGoogle() — initiate OAuth redirect
  signOut.ts                signOut() — clear session, redirect to /sign-in
  session.ts                getSessionToken(), getCurrentUser() helpers
  useSession.ts             React hook over onAuthStateChange

src/components/
  SignInButton.tsx          single-button "Continue with Google"
  UserMenu.tsx              header dropdown: avatar, email, sign out
  AuthGate.tsx              renders children iff session exists; otherwise redirects

src/app/
  sign-in/page.tsx          full-screen sign-in
  auth/callback/route.ts    GET route handler exchanging OAuth code for session
  layout.tsx                unchanged (UserMenu mounted by page.tsx)
  page.tsx                  wraps existing UI in <AuthGate>
```

API client edits (existing files):
- `src/lib/api/ocrTranslate.ts` — accepts `accessToken`, sends as `Authorization: Bearer ...`. Drops the anon-key header path for the Authorization slot (still keeps `apikey` because Supabase Edge requires it).
- `src/lib/api/chat.ts` — same.

Edge Function changes:
- `supabase/config.toml` — explicit `[functions.ocr-translate]` and `[functions.chat]` blocks with `verify_jwt = true`.
- Redeploy both without `--no-verify-jwt`. Handler code is unchanged.

## Data flow

**Sign-in (PKCE):**
1. Unauth'd user lands on `/`. `<AuthGate>` sees no session and `router.replace('/sign-in')`.
2. `/sign-in` renders `<SignInButton>`. Click calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ${origin}/auth/callback } })`.
3. Browser hops to Google. User consents. Google redirects to `https://rrrtsssvoxgbwnyxewqc.supabase.co/auth/v1/callback?code=...`.
4. Supabase exchanges the code, then redirects to our `redirectTo` URL with `?code=<exchange_code>`.
5. `app/auth/callback/route.ts` runs `supabase.auth.exchangeCodeForSession(code)` (server-side, sets HTTP-only cookies as well as localStorage on the next client load), then `redirect('/')`.
6. `<AuthGate>` now sees a session and renders the upload UI.

**Authenticated request:**
1. `handleFile` reads `session.access_token` via `getSessionToken()`.
2. `ocrTranslate({ file, targetLang, accessToken, config })` sends `Authorization: Bearer <jwt>` plus `apikey: <anon>`.
3. Supabase Edge verifies JWT before invoking handler. Invalid → 401, handler never runs.
4. Same for `/chat`.

**Sign-out:** `UserMenu` → `signOut()` → `supabase.auth.signOut()` clears storage and cookies → `router.replace('/sign-in')`.

**Session refresh:** Handled internally by `@supabase/supabase-js`. `useSession` listens on `onAuthStateChange` and re-renders on token rotation; no manual logic needed.

## Error handling

| Failure | UX |
|---|---|
| OAuth flow cancelled / Google tab closed | Land back on `/sign-in`. No error state — user clicks again. |
| OAuth exchange fails on `/auth/callback` (bad/expired code, network) | `route.ts` redirects to `/sign-in?error=oauth_failed`. Sign-in shows banner. |
| Edge Function returns 401 (expired or missing JWT) | API client throws `AuthError`. Store flips `sessionExpired`. `<AuthGate>` re-checks; if expired, redirects to `/sign-in?error=session_expired`. |
| Edge Function returns 429 | Existing handling unchanged. |
| `getSessionToken()` returns null at request time (race with sign-out) | API call short-circuits with `NotAuthenticated`. Gate redirects. |
| Google provider misconfigured server-side | `signInWithOAuth` rejects. Sign-in shows the provider error message. |

No retry logic — auth failures bounce to `/sign-in`. Re-auth is one click.

## Testing

**Unit:**
- `browserClient.ts` — singleton behavior, throws when env missing.
- `signIn.ts` / `signOut.ts` — calls supabase client with correct options (mocked).
- `session.ts` — `getSessionToken` returns null when no session, access_token when session exists.
- `ocrTranslate.ts` / `chat.ts` — new `accessToken` param sent as `Bearer`; tests assert the header value.

**Component:**
- `SignInButton` — click triggers `signInWithGoogle`.
- `UserMenu` — renders email, sign-out click triggers `signOut`.
- `AuthGate` — renders children with session, redirects without.

**Integration (optional, gated by env):**
- `tests/integration/jwt-required.test.ts` — calls deployed `/ocr-translate` with: (1) no Auth header → 401; (2) anon key only → 401; (3) real session JWT from a fixture env var → 200. Skipped in CI by default; runnable locally via `pnpm test:integration`.

**Manual smoke (PR checklist):**
- End-to-end Google sign-in.
- Upload + chat works post-auth.
- Sign out → redirected to `/sign-in`.
- Direct nav to `/` while signed out → redirected.
- Tamper JWT in localStorage → upload returns 401, redirected.

E2E (Playwright) deferred to Phase 9.

## Security notes

- JWT lives in `localStorage` per Supabase default. Acceptable for this product (no service-worker XSS surface yet); revisit if/when we add background fetch or service workers.
- The anon key still flows in the `apikey` header — required by Supabase Edge runtime regardless of JWT auth. It is not a secret.
- `service_role` key is never sent to the browser. Confirmed by audit: only `NEXT_PUBLIC_*` keys are imported into client modules.
- Sign-out clears tokens but does not invalidate the JWT server-side until expiry. Acceptable for v1; if needed later, use `supabase.auth.signOut({ scope: 'global' })`.

## Pre-merge dependencies on Supabase Dashboard

These must be true on the remote Supabase project for OAuth to work locally and in production:
- Authentication → Providers → Google: enabled with the Client ID + Secret the user has already configured.
- Authentication → URL Configuration → Site URL: `http://localhost:3000` (for dev).
- Authentication → URL Configuration → Redirect URLs: includes `http://localhost:3000/auth/callback` and the production URL when ready.

The PR description will list these so the reviewer can verify.

## Out of scope (next PRs)

- Phase 4 — persist reports + messages with RLS-scoped writes.
- Phase 5 — Maps.
- Phases 6–9 — voice, settings, consent, large-text, compliance copy.
