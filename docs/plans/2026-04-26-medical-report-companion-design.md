# Medical Report Companion — Design

**Date:** 2026-04-26
**Status:** Approved, ready for implementation planning
**Author:** Abhishek Bhikule (with Claude Code brainstorming)

## 1. Product Overview

A web app where a user uploads a medical report (PDF or image), gets a plain-language summary in their preferred language, can chat with an AI to ask questions about it, optionally use voice (STT/TTS), and find nearby diagnostic labs or hospitals. Users authenticate with phone OTP or Google OAuth and have a history of past reports and conversations.

### Primary users (v1)

- **Segment A** — Indian non-English-speaking patients who get medical reports in English and don't fully understand them.
- **Segment B** — Elderly patients (any geography) who struggle with medical jargon and want a "talk to my report" experience in plain language.

Both segments share the core need: *"explain my report in language I understand."* Differences are mostly UX (large-text mode for elderly, multi-language translation for regional Indian users).

### Languages supported (v1)

English, Hindi, Tamil, Telugu, Bengali, Marathi.

For elderly English speakers, "translation" is treated separately from "simplification" — they may want plain-language explanation in English, not translation.

## 2. Scope Decisions

### In scope (v1)

- Upload: PDF + image (JPG/PNG), up to 10 MB, up to 20 pages.
- OCR via Google Cloud Vision (`DOCUMENT_TEXT_DETECTION`); auto-detect digital vs scanned PDF.
- Translation via Google Translate, with a curated medical glossary override (~80 terms per language).
- Proactive plain-language summary on report load ("3 things worth noticing").
- Free-form chat grounded in the report.
- Voice: Deepgram Nova-3 (STT) + Aura (TTS) as a toggle on top of text chat.
- Find nearby labs / hospitals / pharmacies via Google Places (manual button trigger).
- Auth: phone OTP (primary) + Google OAuth (secondary). No email/password.
- Persistent history: report extracted text + chat messages + voice transcripts.
- Granular consent toggles (store reports / store chat / store voice transcripts).
- Per-report deletion + full account deletion.

### Out of scope (v1, deferred to later)

- AI-recommended next lab tests or treatments (regulatory firewall — keep maps as logistics-only).
- Storage of original uploaded files (we keep only extracted text — smaller breach blast radius).
- Storage of raw audio recordings (transcripts only).
- AI-triggered map widget inside chat (manual button only for v1).
- Structured "traffic light" visual cards per test value (too much variance across Indian lab PDFs).
- Cross-device session sync (single tab, single device per session in v1).
- Cross-browser exhaustive matrix (Chrome + Safari focused; Firefox best-effort).
- Load testing.
- Full WCAG audit.
- Insurance / accreditation filtering of map results.

### Rejected ideas

- Always-on map panel (privacy creep, wastes screen space).
- Pure voice-first interface (voice has accuracy issues with medical terms in regional languages — keep as toggle).
- Email/password auth (password fatigue, lower fit for elderly + regional users).
- Storing original uploaded files (cost + breach risk without clear UX value).

## 3. Architecture

### Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Zustand. Package manager: pnpm.
- **Backend:** Supabase Edge Functions (Deno).
- **Auth:** Supabase Auth (phone OTP via SMS provider, Google OAuth).
- **Database:** Supabase Postgres with Row-Level Security on every table.
- **Hosting:** Vercel (frontend) + Supabase (backend).
- **LLM:** OpenRouter as default proxy (Gemini 2.0 Flash for cost; Claude Haiku as fallback). Provider-swappable.
- **OCR:** Google Cloud Vision (`DOCUMENT_TEXT_DETECTION`).
- **Translation:** Google Translate API + curated glossary.
- **Voice:** Deepgram Nova-3 (STT) + Aura (TTS).
- **Maps:** Google Places Nearby Search + `@vis.gl/react-google-maps`.

### High-level diagram

```
┌──────────────────────────────────────────────────────────┐
│              Browser (Next.js App Router)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Auth    │  │ History  │  │ Session  │  │ Settings │ │
│  │  pages   │  │ sidebar  │  │  view    │  │  page    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│       Supabase JS client (auth + RLS-scoped DB reads)     │
└─────┬───────────┬──────────┬─────────┬─────────┬─────────┘
      │           │          │         │         │
      ▼           ▼          ▼         ▼         ▼
   Supabase   /ocr-      /chat    /deepgram /places
   Auth +     translate  (DB-     -token
   Postgres   (DB-       backed,
   (JWT)      backed)    streaming)
                         (RLS)
```

### Key architectural commitments

1. **JWT-authenticated Edge Functions.** Every endpoint except `/auth/*` requires a valid Supabase JWT. RLS enforces per-user data scoping at the DB layer.
2. **Streaming chat via SSE** so users see the AI typing.
3. **Per-IP rate limiting** on every Edge Function (5 OCR/min, 30 chat/min, 20 places/min, 30 OCRs/day soft cap).
4. **Logging never includes report content or chat messages.** Only metadata (latency, status, language, page count).
5. **CORS locked** to deployed origin + localhost in dev.
6. **Encryption at rest** via Supabase defaults (AES-256). Verified in compliance checklist.

## 4. Module Breakdown

### Frontend (`src/`)

```
app/
  (auth)/login/page.tsx          # phone OTP + Google OAuth
  (auth)/verify/page.tsx         # OTP entry
  (app)/layout.tsx               # auth-guarded shell
  (app)/page.tsx                 # upload landing (post-auth)
  (app)/session/[id]/page.tsx    # main app: summary + chat + map
  (app)/history/page.tsx         # list of past reports
  (app)/settings/page.tsx        # consents, delete, export

components/
  upload/{DropZone,LanguagePicker}.tsx
  summary/ReportSummary.tsx
  chat/{ChatPanel,MessageBubble,VoiceButton}.tsx
  maps/{PlacesPanel,PlacesMap}.tsx
  history/ReportCard.tsx
  settings/{ConsentToggles,DangerZone}.tsx
  auth/AuthGuard.tsx
  ui/                            # shadcn/ui primitives

lib/
  api/{ocr,chat,deepgram,places,reports,account}.ts
  stores/{authStore,sessionStore,voiceStore}.ts
  i18n/strings.ts
  glossary/medical-terms.ts
  supabase/client.ts             # singleton Supabase JS client
```

### Backend (`supabase/functions/`)

```
ocr-translate/    # multipart upload → Google Vision → Translate → DB write
chat/             # JSON in, SSE out → LLM via OpenRouter → DB write
deepgram-token/   # mints short-lived Deepgram token (60s TTL)
places/           # proxies Google Places Nearby Search
reports/list/     # paginated list of user's reports
reports/get/      # report + messages by id
reports/delete/   # hard delete + cascade
account/delete/   # wipe everything for the user
account/export/   # JSON export (DPDP portability)

_shared/
  cors.ts
  ratelimit.ts
  validate.ts                    # zod schemas for request bodies
  errors.ts                      # standard error response shape
  auth.ts                        # JWT verification helper
  supabase.ts                    # service-role client for server-only ops
```

## 5. Data Model

All tables RLS-protected. Policy on every table: `user_id = auth.uid()`.

```sql
profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users,
  phone           text,
  display_name    text,
  language        text NOT NULL DEFAULT 'en',  -- en|hi|ta|te|bn|mr
  created_at      timestamptz NOT NULL DEFAULT now()
)

reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users,
  title           text,
  source_lang     text,
  target_lang     text NOT NULL,
  extracted_text  text NOT NULL,
  translated_text text,
  page_count      int,
  created_at      timestamptz NOT NULL DEFAULT now()
)

messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid NOT NULL REFERENCES reports ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users,
  role            text NOT NULL CHECK (role IN ('user','assistant')),
  content         text NOT NULL,
  voice_input     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
)

consents (
  user_id                   uuid PRIMARY KEY REFERENCES auth.users,
  store_reports             boolean NOT NULL DEFAULT true,
  store_chat                boolean NOT NULL DEFAULT true,
  store_voice_transcripts   boolean NOT NULL DEFAULT true,
  updated_at                timestamptz NOT NULL DEFAULT now()
)
```

Indexes: `reports(user_id, created_at desc)`, `messages(report_id, created_at)`.

## 6. Data Flows

### F1 — Signup / Login

1. User enters phone → Supabase Auth sends OTP via SMS provider (MSG91/Twilio).
2. User enters OTP → Supabase verifies → JWT issued.
3. First-time: consent screen (3 toggles, all default ON, all individually revocable). On accept, `profiles` + `consents` rows created.
4. Returning: redirect to `/`.

### F2 — Upload → Parsed Report → Summary

1. User picks language and uploads file (≤10 MB, PDF or image).
2. Client validates type/size → POST `/ocr-translate` (multipart, JWT in header).
3. Edge Function: validate, route to digital-PDF parse or Google Vision OCR, detect source language, run Translate with glossary placeholders, return parsed text.
4. If `consents.store_reports = true`: insert into `reports`, return `report_id`. Else: return ephemeral text only.
5. Client navigates to `/session/[report_id]` → triggers F3.

### F3 — Auto-Summary

1. Client POST `/chat` with `mode=summary`, `report_id`.
2. Edge Function loads report (RLS-scoped), builds summary system prompt, streams LLM response.
3. If `consents.store_chat = true`: persist assistant message.

### F4 — Free-form Chat

1. User submits question → POST `/chat` with `mode=chat`, `report_id`, `question`, `history`.
2. Edge Function streams LLM response with safety system prompt ("no diagnosis, no prescription").
3. Post-process safety check on response (regex for prescription patterns); if matched, append safety footer.
4. If `consents.store_chat = true`: persist user + assistant messages.

### F5 — Voice Input (STT)

1. User taps mic → client GET `/deepgram-token` (STT-scoped).
2. Client opens Deepgram WebSocket; mic audio streams; final transcript drops into chat input.
3. User reviews → sends → F4 runs. Transcripts never auto-sent (medical safety).

### F6 — Voice Output (TTS)

1. User taps "read aloud" → GET `/deepgram-token` (TTS-scoped).
2. Client calls Aura with message text + voice ID per language; audio plays.

### F7 — Find Nearby Places

1. User taps "find nearby" → browser geolocation prompt (deferred until needed).
2. Client POST `/places` with `lat/lng/category/radius`.
3. Edge Function calls Google Places Nearby Search; returns name, address, distance, rating, place_id, open_now.
4. Tapping a result opens Google Maps for directions (no in-app routing).

### F8 — History

1. User taps "History" → GET `/reports/list` (paginated).
2. Tap a report → `/session/[id]` → loads report + messages.

### F9 — Deletion

- **Per-report:** DELETE `/reports/delete/[id]` → cascades to messages.
- **Account:** DELETE `/account/delete` → confirm with phone OTP → wipes profile, reports, messages, consents, auth user. Run as transaction.

### F10 — Consent revocation

- Toggle off in settings → modal: "Also delete existing data of this type?" → on yes, hard delete affected rows. Future writes for that category stop.

## 7. Error Handling

Detailed in design discussion (see brainstorming transcript). Key principles:

- **Privacy-preserving error paths:** never log report or chat content even on error. Sentry/log scrubbing configured explicitly.
- **Graceful degradation:** translation fail → show original; voice fail → fall back to text; LLM fail → retry once → fallback model → friendly error preserving question.
- **Streaming interruption:** show partial response with regenerate button.
- **LLM safety post-check:** scan for prescription patterns; on match, append safety footer (don't block).
- **JWT expiry:** silent refresh; on fail, redirect to login preserving chat draft.
- **RLS denial:** 403 returned as "not found" to avoid leaking row existence.
- **Rate limit hit:** 429 with friendly message; daily soft caps for cost runaway.
- **OTP delivery fail:** 30s resend backoff; after 3 fails, suggest Google OAuth.
- **Account deletion partial fail:** transactional, retry job, user-facing "deletion in progress".

## 8. Testing Strategy

### Coverage targets

- 80%+ overall.
- 100% on safety-critical paths: medical-advice post-check, prompt builder, glossary, file validation, RLS policies.

### Test types

- **Unit (Vitest + RTL):** stores, components, glossary, prompt builder, validators, ratelimit.
- **Integration (Vitest):** each Edge Function with mocked providers; rate-limit; CORS.
- **E2E (Playwright):** 10 critical journeys including auth, upload, chat, voice, places, deletion, session expiry, large-text mode.
- **RLS tests (critical):** user A cannot read/modify user B's reports/messages/consents — verified via direct API + direct DB queries.
- **Quality evals (nightly):** OCR accuracy, translation BLEU/chrF, LLM safety (30 jailbreak prompts must be refused), LLM grounding (answers must cite report values).

### Fixtures

Synthetic reports only (no real patient data) generated from public templates with fake values. Set covers digital-en, digital-hi, scanned-en, phone-photo, multi-page, oversized, encrypted, not-a-report.

### CI

- GitHub Actions: lint + typecheck + unit + integration on every PR.
- E2E + RLS on PR to `main`.
- Quality evals post-merge to `main`.

## 9. Compliance Posture

### MVP must-have

- DPDP-compliant privacy policy (data fiduciary identification, data categories, retention, user rights).
- Terms of service with health-data clauses.
- In-app consent screen on signup with granular toggles.
- Settings page with consent toggles + delete + export.
- Encryption at rest verified (Supabase AES-256 default).
- HTTPS-only (Vercel default).
- No logging of report or chat content.
- Working per-report and full-account deletion (including cascade and auth user).

### Post-MVP

- Formal DPO designation (founder serves until scale demands it).
- Admin audit logs (Supabase Pro).
- Documented breach response runbook (72-hour DPDP notification window).
- Data export endpoint (DPDP right to portability) — partially in MVP, formalised post-MVP.

## 10. Phased Build Plan (MVP, functionality-first)

UI is deferred to **Phase 8** by user direction. Phases 0–7 are validated via curl / Postman / test scripts.

| Phase | Deliverable | Validation |
|---|---|---|
| 0 | Project scaffold, Supabase project, env vars, CI skeleton, glossary stub for 6 languages | Build green, CI green |
| 1 | `/ocr-translate` Edge Function (digital + scanned PDF + image, glossary applied) | curl test against fixture PDFs returns parsed text in target language |
| 2 | `/chat` Edge Function (streaming SSE, summary + chat modes, safety prompt + post-check) | curl streams plain-language summary; safety eval suite passes |
| 3 | Supabase Auth (phone OTP + Google), DB schema, RLS policies, JWT verification helper | All endpoints reject unauthenticated calls; RLS test suite passes |
| 4 | `reports/list`, `reports/get`, `reports/delete` + consent gating on writes | curl with two test users verifies isolation; consent toggle stops writes |
| 5 | `/places` Edge Function | curl with lat/lng returns nearby labs/hospitals |
| 6 | `/deepgram-token` + voice transcript persistence | Token issuance test; transcripts stored only when voice consent on |
| 7 | `account/delete` + `account/export` | Delete wipes all data verified by direct DB query; export returns full JSON |
| 8 | Minimal Next.js UI wiring everything together (functional, intentionally unstyled) | All E2E happy paths green |
| 9 | E2E + RLS + safety evals green; compliance checklist complete | Ship gate |

## 11. Open Questions

- SMS provider for phone OTP (Supabase supports MSG91, Twilio, others) — pick during Phase 3.
- LLM model choice — start with `google/gemini-2.0-flash` via OpenRouter; revisit cost/quality after Phase 2 evals.
- Glossary scope — 80 terms is a starting point; grow based on Phase 1 OCR output sampling.
- Hosting region — Supabase project region should be Mumbai (`ap-south-1`) for latency to primary user base.

## 12. Success Criteria

- A first-time user can sign up with phone OTP, upload a report, get a Hindi summary in <30 seconds end-to-end.
- A returning user can view past reports and resume a conversation.
- All RLS tests green; no user can access another user's data.
- LLM safety eval: 30/30 jailbreak prompts refused.
- OCR accuracy on fixture set: >95% for digital PDFs, >85% for phone photos.
- Translation BLEU: >0.55 against ground-truth medical-text translations.
- Per-report and account deletion verified to remove all rows.
