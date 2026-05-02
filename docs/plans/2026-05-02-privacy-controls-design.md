# Privacy Controls — Design

**Date:** 2026-05-02
**Branch:** `feat/privacy-controls`
**Phase mapping:** Closes Phase 4. Per-report delete + settings page exposing the `consents` table.

## Problem

PR #3 added persistence and history but the user has no way to delete a report or to opt out of storage. The `consents` table from Phase 3 sits unused. Without delete + consent, the product is not honestly DPDP-aware and asking elderly users to upload medical records becomes harder to justify.

## Goal

Two slices, one PR:

1. **Per-report delete** with confirm dialog. Cascade to messages via the existing FK.
2. **Settings page at `/settings`** with three toggle switches backed by the `consents` table.

Out of scope: bulk "delete all data" (regret-cost too high without backups; defer to a later compliance PR); the voice toggle is wired to the table but functionally a no-op until Phase 6.

## Architecture

No new migrations. Phase 3 schema covers everything.

```
src/lib/db/
  reports.ts                       +deleteReport(client, id)
  consents.ts                      getConsents (default-on if no row), updateConsents (upsert)
  consents.test.ts

src/components/
  ConfirmDialog.tsx                generic accessible modal: title, body, confirm/cancel
  ConfirmDialog.test.tsx
  DeleteReportButton.tsx           × button + dialog flow
  DeleteReportButton.test.tsx
  HistoryItem.tsx                  +DeleteReportButton when onDelete prop provided
  ConsentToggles.tsx               three switches with descriptions
  ConsentToggles.test.tsx

src/app/
  settings/page.tsx                AuthGate-wrapped; renders ConsentToggles + back-link
  page.tsx                         respect consents on upload + chat; wire delete + history refresh

src/store/useReportStore.ts        +consents (defaults to all-on), +setConsents
```

## Consent semantics

This is the design call worth flagging:

- **`store_reports = false`** → skip BOTH `createReport` AND `createMessage`. Nothing persists. Upload, summary stream, and chat all still work in-memory. History sidebar stays empty for the session.
- **`store_reports = true` AND `store_chat = false`** → persist the report row AND the summary message. The summary is the "interpretation" of the report (its core value), not chat. Skip user/assistant chat turns. On reload, summary appears; chat history does not.
- **`store_voice_transcripts`** → toggle exists, no-op until Phase 6 (voice).

Justification: if `store_reports = true` but the summary doesn't persist, reload gives raw OCR text with no plain-language interpretation, which defeats the point of having a saved report. The summary is part of the report; the chat is the conversation about it. Different layers.

## Defaults & lazy init

The `consents` row is created lazily on first **write**:
- `getConsents(userId)` does `select`. If empty, returns the schema defaults `{ store_reports: true, store_chat: true, store_voice_transcripts: true }` without inserting anything.
- `updateConsents(userId, partial)` does `upsert` on the `user_id` PK with the merged values.

No DB trigger, no profile bootstrap, no migration. The first toggle interaction creates the row.

## Data flow

**Delete:**
1. User clicks × on a history row → `ConfirmDialog` opens: "Delete this report and its chat history? This cannot be undone."
2. Confirm → `deleteReport(supabase, id)` → on success, `refreshHistory()`.
3. If the deleted report was active, `clearReport()` so the upload zone returns.
4. The dialog handles its own "deleting…" state and stays open if the request errors, with an inline retry message.

**Settings:**
1. Header on `/` gets a "Settings" link.
2. `/settings` mount → `getConsents(userId)` → `setConsents(values)` in store. Toggles become enabled.
3. Toggle a switch → optimistic local update → `updateConsents(userId, { [key]: newValue })` → on error, revert and show inline toast.

**Respect on upload/chat:**
1. Before `createReport`, read `consents.store_reports`. If false, skip; set the in-memory report with `id = null` (existing fallback) so chat panel renders but writes are gated.
2. Before each `createMessage`, read `consents.store_chat` AND `report.id !== null`. If either fails, skip.
3. Summary is persisted iff `consents.store_reports === true` (and a report id exists).

## Error handling

| Failure | UX |
|---|---|
| `deleteReport` returns 403 (RLS, expired JWT) | Bounce to `/sign-in?error=session_expired`. |
| `deleteReport` network error | Inline error inside the dialog. Dialog stays open with a retry button. |
| `updateConsents` fails | Toggle visually reverts; toast "Couldn't save your preference." User can retry. |
| `getConsents` fails on settings mount | Error banner with retry; toggles disabled until success. |

## Tests

**Unit (db):**
- `deleteReport` — asserts `.from('reports').delete().eq('id', id)`; throws on error.
- `getConsents` — returns defaults when no row; returns row when present; throws on real errors (not "no rows" cases).
- `updateConsents` — upsert payload includes `user_id` plus the partial.

**Component:**
- `ConfirmDialog` — renders title/body, confirm + cancel call respective props, confirm shows pending state, escape key cancels.
- `DeleteReportButton` — × triggers dialog; confirm calls `onDelete`; success closes dialog; error keeps it open.
- `HistoryItem` — existing tests still pass; new test: delete button rendered iff `onDelete` provided.
- `ConsentToggles` — three switches render with descriptions; toggling fires `onChange` with key + new value.

**Store:**
- `setConsents` updates state; defaults are all true before first set.

**Manual smoke:**
- Delete a report → vanishes from sidebar; if it was active, upload zone returns.
- Toggle `store_reports` off in `/settings` → upload a new report → Supabase Table Editor shows no new rows.
- Toggle back on → next upload writes.
- Toggle `store_chat` off (with reports = on) → upload + chat → DB has report + summary message but no user/assistant turns.

E2E deferred.

## Security

- RLS on `consents` is already in place (Phase 3). Client cannot read or write someone else's row.
- Delete via RLS-scoped query; `eq('id', ...)` is defence-in-depth.
- No service-role usage.
- Optimistic UI for consent toggles is acceptable because the worst-case revert is "your toggle visibly flips back" — no data leak.

## Out of scope (next PRs)

- Bulk "delete all my data" / account closure flow.
- Profile fields (display name, phone) — `profiles` table still empty.
- Phase 5 — Maps.
- Phase 6 — voice (will activate `store_voice_transcripts`).
