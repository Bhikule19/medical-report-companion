# Multilingual Expansion + Re-Translation — Design

**Date:** 2026-05-02
**Branch:** `feat/multilingual`
**Note:** Tests for new code skipped per user instruction; existing 142-test suite must stay green (1 existing assertion will need updating).

## Problem

The product is locked to 6 Indian languages — useful for the original target market but unusable for anyone outside it. Two related limitations:

1. The language picker offers only en, hi, ta, te, bn, mr.
2. After uploading, the user is committed to the language they picked. Switching to another requires re-uploading.

## Goal

1. **Add 8 international languages**: `es`, `fr`, `de`, `pt`, `ru`, `zh`, `ar`, `ja`. Total goes from 6 → 14.
2. **Re-translate any loaded summary** by changing the language picker. Summary re-streams in the new language; chat continues in it.

## Architecture

**Single context-aware picker.** When no report is loaded, the header `LanguagePicker` chooses the language for the next upload (current behaviour). When a report is loaded, changing the picker re-streams the summary in the new language and chat follows. Loading a history item resets the picker to the report's persisted `target_lang` so the UI matches what's on screen.

**Re-translation is session-only.** The persisted summary in the DB stays in its original language. Each language change is a fresh `/chat (mode=summary)` call. Reasoning:
- No new schema, no migration for cached translations.
- Cost is trivial (~$0.0001 per Groq call).
- Simpler mental model: the stored report has one canonical summary; everything else is on-demand.

**No glossary additions.** The medical glossary (10 terms × 6 Indian languages) is used only by the `/ocr-translate` Google-Translate path. Re-translation goes through the LLM, which doesn't use the glossary. New-language summaries are pure LLM output.

## Migration

```sql
-- supabase/migrations/20260502_expand_languages.sql
alter table public.profiles drop constraint if exists profiles_language_check;
alter table public.profiles
  add constraint profiles_language_check
  check (language in ('en','hi','ta','te','bn','mr','es','fr','de','pt','ru','zh','ar','ja'));

alter table public.reports drop constraint if exists reports_source_lang_check;
alter table public.reports
  add constraint reports_source_lang_check
  check (source_lang is null or source_lang in ('en','hi','ta','te','bn','mr','es','fr','de','pt','ru','zh','ar','ja'));

alter table public.reports drop constraint if exists reports_target_lang_check;
alter table public.reports
  add constraint reports_target_lang_check
  check (target_lang in ('en','hi','ta','te','bn','mr','es','fr','de','pt','ru','zh','ar','ja'));
```

Idempotent (`drop constraint if exists`). Reversible by re-running the original constraints.

## Files

```
supabase/migrations/20260502_expand_languages.sql        new
supabase/functions/_shared/validate.ts                   langSchema enum +8
supabase/functions/chat/prompt.ts                        LANGUAGE_DIRECTIVES +8
supabase/functions/voice/stt.ts                          LANG_TO_DEEPGRAM +8

src/lib/types.ts                                         Language +8, LANGUAGES +8
src/components/LanguagePicker.tsx                        optional onChange prop
src/components/ReportSummary.tsx                         LANG_NAME +8
src/app/page.tsx                                         handleLanguageChange callback; loadReport sets store.language to report.target_lang
src/components/LanguagePicker.test.tsx                   one assertion update (6 options → 14)
```

## Native script labels

| Code | Label |
|---|---|
| es | Español |
| fr | Français |
| de | Deutsch |
| pt | Português |
| ru | Русский |
| zh | 中文 |
| ar | العربية |
| ja | 日本語 |

Matches the existing pattern (Hindi shown as हिन्दी, Tamil as தமிழ், etc.).

## Data flow — re-translation

1. User has a loaded report. Header picker shows the report's persisted target language.
2. User changes header picker → store's `setLanguage(newLang)` → page's `handleLanguageChange(newLang)` callback runs.
3. Callback checks: report loaded + session valid → calls existing `streamSummary(reportId, originalText, newLang, accessToken, userId)`.
4. `streamSummary` (unchanged): sets `summaryStreaming: true`, clears the summary in store (via the existing pattern), streams new chunks in the new language. The persisted first-message in DB is untouched.
5. New chat questions automatically use the updated `language` from the store. Replies stream in the new language.
6. On reload or sidebar click, the persisted summary loads (in its original language), picker resets to the persisted lang.

## Voice

- **STT:** Deepgram Nova-3 supports all 8 new languages via the simple code (`es`, `fr`, etc.). Just extend the map.
- **TTS:** Aura is mostly English. The current fallback (`aura-2-thalia-en` for everything) already applies to all non-English. New languages hit the same fallback — user hears English-accented audio of script in their language. Suboptimal but consistent. A polish PR can add Aura voice IDs per language later.

## Error handling

| Failure | UX |
|---|---|
| Re-translate stream fails | Existing path: error appended to summary; user can pick again |
| Picker changed mid-stream | Picker disabled while `summaryStreaming || chatStreaming` (already in store) |
| Migration fails | Reversible — re-run the original constraint list |

## What needs to ship together

- Migration applied to remote DB before frontend ships, otherwise inserts with new languages would 23514 (constraint violation).
- All three Edge Functions redeployed before frontend, otherwise their `langSchema` rejects new languages.

Order: migration → redeploy chat → redeploy ocr-translate → redeploy voice → frontend merge.

## Out of scope

- Per-language Aura voice mapping for TTS quality.
- Persisted alternative-language summaries (cached re-translations).
- UI translation strings (the buttons/labels stay English).
- Glossary entries for new languages.
