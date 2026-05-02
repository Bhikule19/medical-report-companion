# Persistence + History Sidebar — Design

**Date:** 2026-05-02
**Branch:** `feat/persistence-history`
**Phase mapping:** Slice of Phase 4 (history features only). Delete + consent toggles deferred.

## Problem

PR #2 added auth and JWT verification but the in-memory state still vanishes on refresh. The `reports` and `messages` tables sit empty even though authenticated users can now reach them through RLS. We need persistence and a way to revisit past reports.

## Goal

When a signed-in user uploads a report, save it. When they chat, save each turn. On return, show a sidebar of past reports they can click to reload. No delete UI, no consent toggles, no auto-load — those are subsequent PRs.

## Architecture

DB writes happen directly from the browser using `@supabase/supabase-js` with the user's session JWT. RLS policies enforce `auth.uid() = user_id` server-side, so we cannot accidentally read or write someone else's row even if our query is wrong. No new Edge Functions, no new migrations — Phase 3's schema covers it.

Repository pattern, one module per table:

```
src/lib/db/
  reports.ts          createReport, listReports, getReport
  reports.test.ts     mocked supabase client; query-shape and error assertions
  messages.ts         createMessage, listMessagesForReport
  messages.test.ts    same approach

src/components/
  HistorySidebar.tsx  list + "New report" button
  HistoryItem.tsx     single row
  HistorySidebar.test.tsx

src/store/useReportStore.ts          +reportId on Report, +historyList[], +loadReport, +clearReport, +setHistoryList
src/app/page.tsx                     compose sidebar; persist on upload, summary-end, chat send, chat-end
```

## Where the summary lives

`reports.translated_text` from Phase 3 is literal Google Translate of medical jargon — not what the user reads. The plain-language summary streamed from `/chat (mode=summary)` is different and more useful. We persist it as the **first `messages` row with `role='assistant'`** for that report, before any user turns. When reloading a past report, the first assistant message is the summary; everything after is chat. No new column, no migration.

`reports.translated_text` is still written from the OCR response so we have it on file (might use it in a future "show original translation" toggle), but the UI never reads it.

## Title

`reports.title = file.name without extension`. Fallback to `"Report from <local date>"` if the filename is missing or empty. No LLM round-trip; cheap and predictable.

## Data flow

**Upload:**
1. OCR succeeds with `{ original_text, translated_text, source_language, target_language, page_count }`.
2. `createReport({ title, extractedText, translatedText, sourceLang, targetLang, pageCount })` returns the new row's `id`.
3. `setReport({ id, originalText, pageCount, sourceLang })` in the store.
4. Start summary stream on `/chat (mode=summary)`.
5. On stream `done`, `createMessage({ reportId, role: 'assistant', content: store.summary })`.
6. Refresh `historyList` so the new report appears in the sidebar.

**Chat:**
1. User clicks Send. Store: `appendUserMessage(question)`.
2. `createMessage({ reportId, role: 'user', content: question })` (fire-and-await before stream so the user's message is durable even if the stream crashes).
3. Start chat stream on `/chat (mode=chat)`.
4. On stream `done`, `createMessage({ reportId, role: 'assistant', content: store.lastAssistantMessage })`.

**Page mount (with session):**
1. `listReports()` → `setHistoryList(rows)`. Empty array is fine.
2. Sidebar renders. Upload zone visible because no `report` in store yet.

**Click history item:**
1. `getReport(id)` + `listMessagesForReport(id)`.
2. First message's content (assistant) becomes `summary`; remaining messages become `messages[]`.
3. `loadReport(report, messages)` in the store.
4. ReportSummary + ChatPanel render.

**"New report" click:** `clearReport()` → upload zone visible again. The DB row stays.

## Error handling

| Failure | UX |
|---|---|
| `createReport` returns 403 (RLS, expired JWT) | Bounce to `/sign-in?error=session_expired`. Same path as API client 401. |
| `createReport` network error | Inline upload-zone error: "Couldn't save your report. Please try again." Summary stream does not start. |
| `createMessage` fails after summary stream | Toast: "Couldn't save the summary. The conversation will not appear in history." Stream still visible in-memory. |
| `createMessage` fails for chat turn | Same toast. |
| `listReports` fails on mount | Sidebar shows "Couldn't load history" banner with a retry button. Does not block upload. |
| `getReport` / `listMessagesForReport` fails | Toast. Item remains clickable for retry. |

No optimistic UI — write before render. For a medical app the cost of a desync (user thinks something's saved when it isn't) is higher than 200ms of latency.

## Race conditions

- **New upload while summary streaming:** disable upload zone while `summaryStreaming || chatStreaming` (already in store). Existing behaviour, no change.
- **Click another history item mid-stream:** disable history items via the same `streaming` flag. New behaviour to add to `HistoryItem`.
- **Sign-out mid-write:** the in-flight request will return 401, store catches it, bounces to `/sign-in`. Tested via the existing `OcrError` 401 path; same pattern.

## Tests

**Unit (db layer):** Mock the supabase client with a chainable builder. Assert `.from('reports').insert(...)` payload, `.select('*').eq('user_id', uid).order('created_at')` for list, etc. Cover happy path, error propagation, empty list. ~12 tests across `reports.test.ts` + `messages.test.ts`.

**Store:** new actions cover `setHistoryList`, `loadReport`, `clearReport`. Existing tests still pass since the new fields default to safe values. ~4 new tests.

**Component:** `HistorySidebar` empty state, list rendering with mocked db, click triggers loader prop, "New report" triggers reset prop, disabled state during streaming. ~5 tests.

**Manual smoke (PR checklist):**
- Sign in. Upload report. Wait for summary. Send a chat. Refresh.
- See the report in the sidebar. Click it. Summary + both chat turns reload exactly.
- Sign out. Sign back in. Still there.
- Upload a second report. Both visible. Switching loads the right one.

E2E deferred.

## Security notes

- All DB access is RLS-scoped to `auth.uid()`. A bug in our `eq('user_id', ...)` filter would still be caught by RLS — defence in depth.
- No service-role key in the browser. Confirmed.
- Report content + chat content goes to Supabase. This is consistent with the architectural commitment locked in `medical-report-companion.md` memory: "history persistence (Phase 3+): extracted text + chat messages + voice transcripts. NEVER store original uploaded files."

## Out of scope (next PRs)

- Per-report delete with confirm dialog.
- Settings page exposing the `consents` table booleans.
- Title generation via LLM.
- Pagination of `listReports` (currently fetches all; revisit at >100 reports per user).
- Voice transcripts (Phase 6).
