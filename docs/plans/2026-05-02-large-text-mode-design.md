# Large-Text Mode — Design

**Date:** 2026-05-02
**Branch:** `feat/large-text-mode`
**Phase mapping:** Phase 7, scoped to text-size scaling only.

## Problem

The product memory locks elderly Indian users as a primary audience. The PR #1 design doc deferred a "formal large-text toggle" to Phase 7, settling for a generous 18 px base in the meantime. The base size helps but does not let a user with low vision actually scale the text.

## Goal

A "Display" section in `/settings` with three text-size options — **Standard** (1.125x), **Large** (1.40x), **Extra-large** (1.625x). Per-device persistence via `localStorage`. No DB change. Effective base font: 18 px / 22.4 px / 26 px.

Out of scope: touch-target size scaling, contrast / dark mode, reading-width adjustment. Each is its own polish PR.

## Architecture

A CSS variable `--font-scale` on `<html>` drives a `font-size: calc(16px * var(--font-scale))` rule on `html`. Tailwind classes use `rem`, so all spacing, line-height, and text size scale together. Existing `text-[18px]` arbitrary-value on the body becomes `text-base` so it scales with the variable.

```
src/lib/display/textScale.ts       constants + loadTextScale + saveTextScale + applyTextScale
src/lib/display/textScale.test.ts

src/components/TextScalePicker.tsx three buttons (radio-group semantics with aria-pressed)
src/components/TextScalePicker.test.tsx

src/app/layout.tsx                 +inline <script> that sets --font-scale from localStorage before first paint
src/app/globals.css                +:root { --font-scale: 1.125; } html { font-size: calc(16px * var(--font-scale)); }
src/app/settings/page.tsx          +Display section with TextScalePicker
```

## Hydration

Without an inline script, the page paints with the default scale, then React hydrates and bumps the size — a visible flash. Standard mitigation (same pattern `next-themes` uses): a tiny inline `<script dangerouslySetInnerHTML={...}>` in `<head>` that reads localStorage and writes the CSS variable synchronously, before React hydrates. The script's contents are static and trusted.

## Data flow

1. **First load:** inline script reads `localStorage.getItem('text-scale')` (default `'standard'`), sets `--font-scale` on `<html>`. No flash.
2. **Settings mount:** `loadTextScale()` reads the same value into local React state for the picker.
3. **User clicks "Large":** `saveTextScale('large')` (localStorage) + `applyTextScale('large')` (CSS variable). Re-render is unnecessary — the variable change repaints the page.

## Error handling

- Browser without `localStorage`: scale still applies for the session; no persistence.
- Corrupted / unknown stored value: fallback to `'standard'`.
- Inline script fails (rare CSP issues): page renders at default scale; settings page still works.

## Testing

**Unit (textScale):**
- `loadTextScale` — returns `'standard'` when key missing, returns stored value when present, returns `'standard'` for invalid stored values.
- `saveTextScale` — writes localStorage at the right key.
- `applyTextScale` — sets `--font-scale` on `document.documentElement` to the right number for each option.

**Component (TextScalePicker):**
- Three buttons render with the correct labels.
- The active option has `aria-pressed='true'`; the others have `'false'`.
- Click fires `onChange` with the right value.
- Clicking the active option does not refire `onChange`.

**Manual smoke:**
- `/settings` → toggle Large → all text bumps up immediately.
- Refresh → still Large.
- Toggle Extra-large → bumps further.
- Toggle Standard → back to current default size.
- Sign out, sign back in → preference preserved (localStorage outlives auth).

## Security

- Inline script content is static; no user input is interpolated. `dangerouslySetInnerHTML` is acceptable here.
- localStorage value is validated on read; invalid values fall back to default.

## Out of scope (next PRs)

- Touch-target / button-size scaling.
- Contrast / dark mode.
- Reading-width adjustment.
- Phase 6 — voice (STT + TTS).
- Phase 8 — compliance copy + privacy policy + ToS.
- Phase 9 — Playwright E2E.
