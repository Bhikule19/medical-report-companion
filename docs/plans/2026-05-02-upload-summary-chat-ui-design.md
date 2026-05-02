# Upload + Summary + Chat UI — Design

**Date:** 2026-05-02
**Branch:** `feat/upload-summary-chat-ui`
**Phase mapping:** First slice of Phase 4 (frontend MVP), without auth or persistence.

## Problem

The Phase 1 and Phase 2 Edge Functions (`/ocr-translate`, `/chat`) are deployed and working, but the Next.js frontend is a three-line placeholder. There is nothing to look at, demo, or share. We need a minimum visible surface that exercises both functions end-to-end.

## Scope

A single client-rendered page at `/` that:

1. Lets the user pick a target language (en, hi, ta, te, bn, mr; default `hi`).
2. Accepts a PDF or image (≤10 MB) via drag-drop or file picker.
3. POSTs the file to `/ocr-translate` to extract the report text (`original_text`) plus metadata (page count, source language detection).
4. Auto-triggers `/chat` with `mode=summary` to stream a plain-language summary in the chosen language. The `translated_text` returned by `/ocr-translate` is a literal machine translation of medical jargon and is not user-facing — only `original_text` is fed to `/chat`, and the LLM handles both interpretation and target-language output via its system prompt.
5. After the summary stream completes, exposes a chat panel that streams responses from `/chat` (`mode=chat`) token-by-token via SSE, resending the report text and history on every call.

Explicitly out of scope for this PR: authentication, history persistence, voice, maps, large-text toggle, settings page, consent UI.

## Architecture

Single client-rendered Next.js page. No Next API routes — frontend talks directly to Supabase Edge Functions using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, both already present in `.env.local`.

```
src/app/page.tsx                    main page, composes child components
src/components/
  UploadZone.tsx                    drag-drop + file picker, 10 MB cap, accepts pdf/jpg/png
  LanguagePicker.tsx                six-option dropdown, default hi
  ReportSummary.tsx                 displays translated text + page count + source
  ChatPanel.tsx                     message list + input + SSE stream consumer
  ChatMessage.tsx                   single message bubble
src/lib/api/
  ocrTranslate.ts                   POST FormData → /ocr-translate, returns typed result
  chat.ts                           POST JSON → /chat, returns async iterator over SSE tokens
src/store/
  useReportStore.ts                 Zustand: language, report, messages[]
src/lib/types.ts                    shared TS types (Language, Report, ChatMessage, etc.)
```

Both API client modules accept an injectable `fetchImpl` — mirrors the backend testing convention so we can unit-test without real network calls.

## Data flow

1. User selects language → `useReportStore.setLanguage(lang)`.
2. User drops a file → `UploadZone` validates size/type → `ocrTranslate({ file, targetLang, fetchImpl })` → on success, `useReportStore.setReport({ originalText, pageCount, sourceLang })` (no `translated_text` is stored — it's discarded).
3. With a report set, the page auto-calls `chat({ mode: "summary", reportText, language, fetchImpl })`. Tokens stream into `useReportStore.summary` until the SSE `done` event.
4. `ReportSummary` renders the streaming summary text. `ChatPanel` renders once the summary stream finishes.
5. User sends a chat message → `useReportStore.appendMessage({ role: "user", content })` → `chat({ mode: "chat", reportText, language, history, question, fetchImpl })` returns an async iterator → for each chunk, `useReportStore.appendToLastAssistantMessage(chunk)`.

The frontend never persists; the store is in-memory only. Refresh = blank slate. This is acceptable for the MVP; persistence comes with auth.

## Styling

Plain Tailwind v3 (already configured in `postcss.config.js` / `tailwind.config.ts`). No shadcn install — keeps the PR small.

Constraints honoured:
- Base font 18 px, generous spacing (elderly-user constraint).
- Simple two-column desktop layout, single-column on mobile (Tailwind responsive classes).
- No animations beyond the chat stream cursor.

Formal large-text toggle deferred to Phase 7.

## Error handling

| Failure | UX |
|---|---|
| File >10 MB | Inline error in `UploadZone`; no request fired |
| File wrong type | Inline error |
| OCR HTTP 429 | Banner with `"Try again in {Retry-After}s"` |
| OCR other failure | Red banner with retry button |
| Chat HTTP error | Append assistant message ending with `"(connection lost — retry)"`; the retry hits `/chat` again with the same payload |
| Chat stream interrupted | Same as above |

All errors logged via `console.error` for now; structured client-side logging deferred (Phase 8).

## Testing

Per the 80%-coverage rule:

- **Unit (`src/lib/api/*`):** both clients with `fetchImpl` injected. Cover happy path, 429 with `Retry-After`, generic 5xx, malformed body. SSE iterator covers `data:` chunks, `[DONE]` sentinel, and stream errors.
- **Unit (`src/store/useReportStore.ts`):** language change, setReport, appendMessage, appendToLastAssistantMessage (creates assistant message if last is user; appends if last is assistant).
- **Component (RTL + Vitest jsdom):**
  - `UploadZone`: file too large → inline error; valid file → calls onUpload prop.
  - `LanguagePicker`: change event updates store.
  - `ChatPanel`: user submits → input cleared, message rendered; assistant streaming token appended in place; input disabled mid-stream.
- **E2E (Playwright):** deferred to Phase 9.

Target: 80%+ statements/branches across `src/lib/api/`, `src/store/`, `src/components/`. The page itself is a thin composition and is exercised by E2E later.

## Security & secrets

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is anon by design; it is not a secret in the conventional sense, but we still avoid logging it. RLS prevents misuse once Phase 3.4 wires auth.
- No file content or chat content is logged — matches the locked architectural commitment.
- File is sent directly to the Edge Function and never persisted client-side beyond the in-flight request.

## What the user must provide

Nothing for the build:
- Env vars already in `.env.local`.
- Both Edge Functions deployed and reachable with anon key (currently `--no-verify-jwt`).
- GitHub remote already set to `Bhikule19/medical-report-companion`.

After PR opens:
- Pull the branch, `pnpm install && pnpm dev`, exercise the page, leave review comments.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Edge Function CORS rejects browser origin | Functions already include `cors` headers from Phase 1/2; verify in dev with one round-trip before building UI. |
| SSE parsing fragile across runtimes | Use the standard `ReadableStream` + `TextDecoder` pattern with a small line buffer; cover with unit tests for partial-chunk arrival. |
| Anon key exposed in browser bundle | Expected — that's the contract for `NEXT_PUBLIC_*`. Real protection comes from RLS in Phase 3.4. |
| Page renders before env vars present | Fail fast: throw in the API clients if env is missing, surface as a banner. |

## Out of scope (next PRs)

- PR #2: Phase 3.4 — Google OAuth, JWT verification on Edge Functions.
- PR #3: Phase 4 proper — persist reports + messages with RLS-scoped writes.
- PR #4: Phase 5 — Maps.
- PR #5+: voice, settings, consent, large-text, compliance copy.
