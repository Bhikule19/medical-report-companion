# Compliance Copy — Design

**Date:** 2026-05-02
**Branch:** `feat/compliance-copy`
**Phase mapping:** Phase 8 of the master implementation plan, scoped to legal pages + first-time consent + footer.

## Problem

The product is feature-complete enough that the actual blocker for showing it to a user is compliance: there is nothing to read before deciding to upload a sensitive medical document. DPDP (India's Digital Personal Data Protection Act 2023) and basic web ethics both require a privacy policy and terms. The architectural firewall ("AI never recommends specific medical actions") is meaningful only if it is communicated to the user.

## Goal

Three things, bundled:

1. **`/privacy` page** — privacy policy.
2. **`/terms` page** — Terms of Service with a prominent **not medical advice** disclaimer.
3. **First-time consent gate** — after sign-in, an interstitial that requires the user to acknowledge "I have read and agree" before reaching the rest of the app. Stored per-device in `localStorage` with the policy version.
4. **Footer** with policy links on every authenticated page.

## Out of scope (next PRs)

- "Download my data" export.
- Bulk "delete all my data" / account closure.
- Cookie banner (we use no third-party tracking cookies; only Supabase auth state, which is functional).
- DB-backed acknowledgement audit trail (a real `acknowledgements` table). LocalStorage is acceptable for v1.

## Disclaimer

I am not a lawyer. The two legal pages will be reasonable starting drafts informed by:

- DPDP Act 2023 basics (notice, purpose limitation, consent, rights).
- The actual data flows we built (Supabase Mumbai region, Google Vision/Translate, Groq, Google Places).
- The architectural commitments locked in `medical-report-companion.md` memory.

**Before any public launch, the content needs review by a qualified lawyer.** This is called out at the top of each legal page and in the PR description.

## Architecture

```
src/lib/legal/
  versions.ts                     POLICY_VERSION constant — bump on meaningful copy changes
  acknowledge.ts                  loadAck, saveAck, hasAcknowledgedCurrent
  acknowledge.test.ts

src/components/
  Footer.tsx                      links to /privacy, /terms
  ConsentInterstitial.tsx         "I agree" UI; takes onAccept prop
  ConsentInterstitial.test.tsx
  ConsentGate.tsx                 wraps children; renders interstitial if ack stale
  ConsentGate.test.tsx

src/app/
  privacy/page.tsx                static content (no auth gate)
  terms/page.tsx                  static content (no auth gate)
  page.tsx                        +<ConsentGate>, +<Footer>
  settings/page.tsx               +<Footer>
  nearby/page.tsx                 +<Footer>
```

## Consent gate flow

1. `<AuthGate>` resolves with a session.
2. `<ConsentGate>` reads `localStorage.getItem('tos-acknowledged-version')`. If it equals `POLICY_VERSION`, renders children. Otherwise renders `<ConsentInterstitial>`.
3. User reads the policy + ToS via in-interstitial links → returns → ticks "I agree" → clicks Continue → `saveAck(POLICY_VERSION)` → component re-renders → children appear.
4. Bumping `POLICY_VERSION` (on real policy updates) forces all users to re-acknowledge once.

**Important:** `/privacy` and `/terms` are NOT auth-gated. Anyone with the URL can read them. The consent gate is between auth and the rest of the app, not before the public legal pages.

## Placeholders

The legal copy will contain three clearly-marked placeholders that the user updates before launch:

- `[CONTACT_EMAIL]` — privacy contact / data-request inbox.
- `[JURISDICTION]` — governing-law jurisdiction (default Maharashtra, India).
- `[ENTITY_NAME]` — natural-person or company entity providing the service.

Find / replace once before public launch. No code change needed.

## Content approach

JSX with a small set of inline Tailwind utility classes for typography. No MDX, no `@tailwindcss/typography` plugin (would add ~100 KB for two pages). Section headings use `h2`/`h3`; body uses `p`; lists use `ul`. Each page ≈150 lines.

## Privacy policy outline

1. Who we are.
2. What data we collect — auth metadata, uploaded report content, chat content, geolocation (only when user opens `/nearby`), preference data.
3. Where it is stored — Supabase managed PostgreSQL in Mumbai (`ap-south-1`).
4. Who can access it — only the signed-in user via RLS; nobody else.
5. Third parties involved in processing — Google Cloud Vision (OCR), Google Cloud Translate (translation), Groq (LLM inference), Google Maps Platform (Places). What each receives. None receives the user's identity.
6. Retention — until the user deletes the report or closes the account.
7. Your rights under DPDP — access, correction, erasure, withdrawal of consent.
8. How to exercise rights — contact email + in-app delete buttons.
9. Children — service not intended for users under 18.
10. International transfers — none currently; data stays in Mumbai region. (Vision / Translate / Groq / Maps are external API calls; their global infrastructure is governed by their own policies, linked.)
11. Changes to this policy — versioned, you'll be notified on next sign-in.
12. Contact + last-updated date.

## Terms of Service outline

1. Acceptance.
2. Service description.
3. **Important: not medical advice.** Prominent box. The summaries and chat are educational only; do not replace a doctor.
4. Eligibility (18+).
5. Account responsibilities (accurate info, secure password — though we use Google OAuth so password rules don't apply directly).
6. Acceptable use (not for emergency triage; no fraud / abuse).
7. Content ownership — your report content remains yours; you grant us a limited licence only to render it back to you.
8. Limitations of liability — service provided "as is"; no warranty for medical correctness.
9. Termination — you can sign out, delete reports, request full deletion via email any time.
10. Governing law — `[JURISDICTION]`.
11. Changes — versioned.
12. Contact + last-updated date.

## Testing

**Unit (acknowledge):**
- `loadAck` returns null when key missing; returns the stored version string when present; returns null when stored value is empty; safe under localStorage failures.
- `saveAck(version)` writes `tos-acknowledged-version`.
- `hasAcknowledgedCurrent()` returns `true` only when stored version equals `POLICY_VERSION`.

**Component:**
- `ConsentInterstitial` — renders heading; Continue button is disabled until checkbox is ticked; clicking Continue fires `onAccept`; legal links open in new tab with `rel="noopener noreferrer"`.
- `ConsentGate` — renders children when `hasAcknowledgedCurrent()` returns true; renders interstitial otherwise; after `onAccept`, children appear.
- `Footer` — renders links to `/privacy` and `/terms` with correct hrefs.

**No tests for the static pages** — pure JSX with no logic; render + visual check covered by build.

**Manual smoke:**
- Fresh sign-in → interstitial appears → can read `/privacy` and `/terms` via links → return → tick + Continue → main app appears.
- Refresh → no interstitial.
- DevTools `localStorage.removeItem('tos-acknowledged-version')` → refresh → interstitial again.
- Visit `/privacy` and `/terms` directly while signed out → no auth gate, content renders.
- Click footer links from `/`, `/settings`, `/nearby` → arrive at the right page.

## Security

- Static legal pages are intentionally public; no PII, no secrets.
- Consent acknowledgement in localStorage is weak for audit purposes; for a real launch with regulatory scrutiny, move to a DB `acknowledgements` table with timestamp and signed user agent. Documented as future work.
- Inline JSX content — no `dangerouslySetInnerHTML`, no XSS surface.

## Out of scope (next PRs)

- "Download my data" export — JSON dump of reports + messages + consents.
- Bulk delete / account closure — wipe profile + reports + messages with RLS-scoped DELETE.
- DB-backed acknowledgement audit table.
- Phase 6 — voice (STT + TTS).
- Phase 9 — Playwright E2E.
