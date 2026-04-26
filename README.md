# Medical Report Companion

Web app for uploading medical reports, getting plain-language summaries in 6 languages (English, Hindi, Tamil, Telugu, Bengali, Marathi), chatting with an AI grounded in the report, optionally using voice, and finding nearby diagnostic labs / hospitals.

**Status:** Design approved 2026-04-26. Implementation in progress.

See [docs/plans/2026-04-26-medical-report-companion-design.md](docs/plans/2026-04-26-medical-report-companion-design.md) for full design.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Zustand
- Supabase (Auth + Postgres + Edge Functions)
- Google Cloud Vision (OCR), Google Translate, Google Places
- OpenRouter (LLM proxy: Gemini Flash / Claude Haiku)
- Deepgram Nova-3 (STT) + Aura (TTS)
- pnpm

## Phased build (MVP, backend-first)

1. Project scaffold + CI
2. `/ocr-translate` Edge Function
3. `/chat` Edge Function (streaming + safety)
4. Supabase Auth + DB + RLS
5. Reports CRUD + consent gating
6. `/places`
7. Voice (`/deepgram-token`) + transcript persistence
8. Account delete + export
9. Minimal Next.js UI
10. E2E + RLS + safety evals + compliance close-out

UI is intentionally last — all backend functionality is validated via curl / test scripts before any React components ship.
