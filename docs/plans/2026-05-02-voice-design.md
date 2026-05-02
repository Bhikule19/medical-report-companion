# Voice (STT + TTS) — Design

**Date:** 2026-05-02
**Branch:** `feat/voice`
**Phase mapping:** Phase 6 of the master implementation plan.
**Note:** Tests deferred for this PR per user instruction; existing 142-test suite remains green.

## Problem

The product is feature-complete except for voice. Elderly Indian users — the locked target audience — benefit most from being able to speak questions and hear answers. Without voice, the app demands literacy in their typed-input language and good vision for output, both of which the brief calls out as constraints.

## Goal

Two slices in one PR:

1. **STT** — mic button next to chat Send. Click → record → click again → audio uploads to a new Edge Function → Deepgram Nova-3 transcribes → transcript populates the input field. User reviews and clicks Send.
2. **TTS** — speaker icon on every assistant message and on the report summary. Click → text + language uploads to the Edge Function → Deepgram Aura returns audio → browser plays it.

## Architecture (key decision)

`DEEPGRAM_API_KEY` is **server-side only**, unlike the Maps key. Voice operations therefore go through a new Edge Function, not direct browser-to-Deepgram. This adds one network hop but is the only safe pattern.

```
supabase/functions/voice/
  index.ts          Deno.serve handler — JWT verified by Supabase Edge runtime, CORS, rate limit, mode dispatch
  stt.ts            multipart in → POST /v1/listen → JSON transcript out
  tts.ts            JSON in → POST /v1/speak → audio/mpeg out
```

```
src/lib/audio/recorder.ts          MediaRecorder wrapper: start, stop, getBlob
src/lib/api/voice.ts               transcribeAudio + synthesizeSpeech
src/components/VoiceInputButton.tsx mic UI; record/stop/disabled states
src/components/SpeakButton.tsx     speaker UI; idle/loading/playing states
src/components/ChatPanel.tsx       +VoiceInputButton next to Send (when MediaRecorder available)
src/components/ChatMessage.tsx     +SpeakButton on assistant role only
src/components/ReportSummary.tsx   +SpeakButton next to the heading
src/app/page.tsx                   thread accessToken + voice_input flag through to createMessage
```

## Consent semantics

The `store_voice_transcripts` toggle from PR #4 (functional no-op until now) becomes meaningful:

- `store_voice_transcripts = true && store_chat = true` → voice-originated chat messages persist with `voice_input = true`.
- `store_voice_transcripts = false && store_chat = true` → voice messages still work in-session but are NOT persisted.
- `store_chat = false` → nothing chat-related persists.

This matches the schema comment locked in PR #1.

## Audio formats

- **Browser → server (STT):** `MediaRecorder` outputs `audio/webm;codecs=opus` on Chrome/Firefox/Edge, `audio/mp4` on Safari. Send as multipart with the actual mimetype. Deepgram Nova-3 accepts both.
- **Server → browser (TTS):** Deepgram Aura returns `audio/mpeg`. Edge Function pipes it through. Browser plays via `new Audio(URL.createObjectURL(blob))`.

## Data flow

**STT:**
1. Mic click → `getUserMedia({ audio: true })`.
2. `MediaRecorder` starts. Button shows recording dot.
3. Mic clicked again → recorder stops → Blob.
4. POST to `/voice` (mode=stt) with multipart form (`audio`, `language`).
5. Response `{ transcript }` populates input.
6. User reviews + clicks Send → existing flow with `voice_input: true`.

**TTS:**
1. Speaker click → button shows spinner.
2. POST `/voice` (mode=tts) JSON `{ text, language }`.
3. Response is `audio/mpeg` — wrap as Blob → Audio → play.
4. While playing, button is a stop icon.
5. Audio end → button reverts.

## Auth + rate limits on the new function

- JWT verification ON (matches `verify_jwt = true` pattern in `supabase/config.toml`).
- Per-IP limit 30 req/min.
- 30 MB body cap on STT (audio uploads can be sizeable).

## Error handling

| Failure | UX |
|---|---|
| Mic permission denied | Toast: "Microphone access is required for voice input." Button disabled. |
| MediaRecorder unsupported | Mic button hidden entirely. |
| STT 401 (expired JWT) | Bounce to /sign-in. Same path as upload 401. |
| STT 429 | Toast: "Voice limit reached. Try again soon." |
| STT 500 / network | Toast: "Couldn't transcribe. Please type instead." Recording discarded. |
| TTS errors | Toast on speaker; button reverts. |
| Mic during chat stream | Mic disabled while `streaming === true`. |

## Required Supabase setup

- `supabase secrets set DEEPGRAM_API_KEY=...` against the project.
- `supabase functions deploy voice` (verify_jwt true via config.toml).

User pre-authorised these CLI calls in earlier PRs.

## Out of scope (next/future PRs)

- Live-streaming STT (REST batch is enough for v1).
- Auto-play of summaries (intrusive).
- TTS audio caching (per-text+lang cache to save Deepgram calls).
- Voice-mode-only UX flag.
- Full Phase 9 — Playwright E2E covering voice paths.
