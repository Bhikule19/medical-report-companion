# Large-Text Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Display section in `/settings` with three text-size options that scale all text on the site by writing a CSS variable on `<html>`.

**Architecture:** Pure client-side. A CSS variable `--font-scale` on `<html>` drives `html { font-size: calc(16px * var(--font-scale)) }`. Tailwind's `rem`-based sizing scales automatically. An inline `<script>` in `<head>` reads `localStorage` synchronously before paint to avoid a flash on first load. A `TextScalePicker` component in the settings page persists changes to `localStorage` and updates the CSS variable.

**Tech Stack:** Next.js 15.5.15 · React 19 · TypeScript · Tailwind v3 · Vitest 4 · @testing-library/react · jsdom.

**Reference:** Design at `docs/plans/2026-05-02-large-text-mode-design.md`. Existing settings page at `src/app/settings/page.tsx`. Layout at `src/app/layout.tsx`.

---

## Task 1: textScale module (TDD)

**Files:**
- Create: `src/lib/display/textScale.ts`
- Create: `src/lib/display/textScale.test.ts`

**Step 1: Failing tests**

```typescript
// src/lib/display/textScale.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TEXT_SCALES,
  TEXT_SCALE_VALUES,
  loadTextScale,
  saveTextScale,
  applyTextScale,
  type TextScale,
} from './textScale';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty('--font-scale');
});

describe('TEXT_SCALE_VALUES', () => {
  it('maps each option to a numeric multiplier', () => {
    expect(TEXT_SCALE_VALUES.standard).toBe(1.125);
    expect(TEXT_SCALE_VALUES.large).toBe(1.4);
    expect(TEXT_SCALE_VALUES['extra-large']).toBe(1.625);
  });

  it('TEXT_SCALES contains all three options', () => {
    expect(TEXT_SCALES).toEqual(['standard', 'large', 'extra-large']);
  });
});

describe('loadTextScale', () => {
  it('returns "standard" when nothing is stored', () => {
    expect(loadTextScale()).toBe('standard');
  });

  it('returns the stored value when valid', () => {
    localStorage.setItem('text-scale', 'large');
    expect(loadTextScale()).toBe('large');
  });

  it('returns "standard" when stored value is invalid', () => {
    localStorage.setItem('text-scale', 'huge');
    expect(loadTextScale()).toBe('standard');
  });

  it('returns "standard" when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadTextScale()).toBe('standard');
    spy.mockRestore();
  });
});

describe('saveTextScale', () => {
  it('writes the value to localStorage at the right key', () => {
    saveTextScale('large');
    expect(localStorage.getItem('text-scale')).toBe('large');
  });

  it('does not throw when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveTextScale('large' as TextScale)).not.toThrow();
    spy.mockRestore();
  });
});

describe('applyTextScale', () => {
  it('sets --font-scale on the document root', () => {
    applyTextScale('large');
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.4');
  });

  it('updates --font-scale when called again', () => {
    applyTextScale('large');
    applyTextScale('extra-large');
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.625');
  });
});
```

**Step 2: Run** → FAIL.

```bash
pnpm test -- src/lib/display/textScale.test.ts
```

**Step 3: Implementation**

```typescript
// src/lib/display/textScale.ts
export const TEXT_SCALES = ['standard', 'large', 'extra-large'] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export const TEXT_SCALE_VALUES: Record<TextScale, number> = {
  standard: 1.125,
  large: 1.4,
  'extra-large': 1.625,
};

const STORAGE_KEY = 'text-scale';
const DEFAULT: TextScale = 'standard';

function isTextScale(value: unknown): value is TextScale {
  return typeof value === 'string' && (TEXT_SCALES as readonly string[]).includes(value);
}

export function loadTextScale(): TextScale {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isTextScale(value) ? value : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function saveTextScale(scale: TextScale): void {
  try {
    localStorage.setItem(STORAGE_KEY, scale);
  } catch {
    // private mode or quota error — best effort
  }
}

export function applyTextScale(scale: TextScale): void {
  const value = TEXT_SCALE_VALUES[scale];
  document.documentElement.style.setProperty('--font-scale', String(value));
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/lib/display/textScale.ts src/lib/display/textScale.test.ts
git commit -m "feat(display): textScale module — load/save/apply with safe fallbacks"
```

---

## Task 2: TextScalePicker component (TDD)

**Files:**
- Create: `src/components/TextScalePicker.tsx`
- Create: `src/components/TextScalePicker.test.tsx`

**Step 1: Failing tests**

```typescript
// src/components/TextScalePicker.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextScalePicker } from './TextScalePicker';

describe('TextScalePicker', () => {
  it('renders three buttons with correct labels', () => {
    render(<TextScalePicker value="standard" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /standard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^large$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /extra-large/i })).toBeInTheDocument();
  });

  it('marks the active option with aria-pressed=true', () => {
    render(<TextScalePicker value="large" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /^large$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /standard/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('fires onChange when an inactive option is clicked', async () => {
    const onChange = vi.fn();
    render(<TextScalePicker value="standard" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^large$/i }));
    expect(onChange).toHaveBeenCalledWith('large');
  });

  it('does not fire onChange when the active option is clicked', async () => {
    const onChange = vi.fn();
    render(<TextScalePicker value="standard" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /standard/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/TextScalePicker.tsx
'use client';

import { TEXT_SCALES, type TextScale } from '@/lib/display/textScale';

const LABELS: Record<TextScale, string> = {
  standard: 'Standard',
  large: 'Large',
  'extra-large': 'Extra-large',
};

export interface TextScalePickerProps {
  value: TextScale;
  onChange: (next: TextScale) => void;
}

export function TextScalePicker({ value, onChange }: TextScalePickerProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Text size">
      {TEXT_SCALES.map((scale) => {
        const active = scale === value;
        return (
          <button
            key={scale}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) onChange(scale);
            }}
            className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'border-slate-700 bg-slate-800 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
            }`}
          >
            {LABELS[scale]}
          </button>
        );
      })}
    </div>
  );
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/TextScalePicker.tsx src/components/TextScalePicker.test.tsx
git commit -m "feat(ui): TextScalePicker with three options and ARIA pressed state"
```

---

## Task 3: Globals CSS — variable + base size

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add the variable rule**

Read the current `globals.css` first to see existing content. Then prepend:

```css
:root {
  --font-scale: 1.125;
}

html {
  font-size: calc(16px * var(--font-scale));
}
```

The existing Tailwind layers should remain untouched. The base font is now 18 px when the variable defaults to 1.125, matching the previous body-text size.

**Step 2: Verify build**

```bash
pnpm build
```

Expected: builds cleanly.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(display): --font-scale CSS variable on html for global text scaling"
```

---

## Task 4: Layout — inline script for hydration-safe scale + drop arbitrary text size

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Read the file first** to see the current shape.

**Step 2: Replace the body to drop `text-[18px]` (now redundant) and add inline script before children**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Medical Report Companion',
  description: 'Upload your medical report and understand it in your language.',
};

const TEXT_SCALE_INIT = `
(function() {
  try {
    var v = localStorage.getItem('text-scale');
    var map = { standard: '1.125', large: '1.4', 'extra-large': '1.625' };
    var value = map[v] || '1.125';
    document.documentElement.style.setProperty('--font-scale', value);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEXT_SCALE_INIT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

The `text-[18px]` is removed — base is now driven by the CSS variable.

**Step 3: Verify build**

```bash
pnpm build
```

Expected: succeeds.

**Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(display): inline pre-paint script applies text-scale from localStorage"
```

---

## Task 5: Wire TextScalePicker into Settings page

**Files:**
- Modify: `src/app/settings/page.tsx`

**Step 1: Read current settings page** to confirm shape.

**Step 2: Add Display section**

Inside `SettingsContent`, after the Privacy section's closing `</section>`, add a new Display section. Add the relevant imports and a small `useState` block.

Imports to add:
```typescript
import { TextScalePicker } from '@/components/TextScalePicker';
import { loadTextScale, saveTextScale, applyTextScale, type TextScale } from '@/lib/display/textScale';
```

State + effect inside `SettingsContent` (place near the existing state declarations):
```typescript
const [textScale, setTextScale] = useState<TextScale>('standard');

useEffect(() => {
  setTextScale(loadTextScale());
}, []);

function handleScaleChange(next: TextScale) {
  setTextScale(next);
  saveTextScale(next);
  applyTextScale(next);
}
```

JSX section to add after the Privacy section:
```tsx
<section className="rounded-lg bg-white p-6 shadow-sm">
  <h2 className="text-lg font-medium text-slate-900">Display</h2>
  <p className="mt-1 text-sm text-slate-600">
    Make text bigger if it is hard to read. The change applies right away and is
    remembered on this device.
  </p>
  <div className="mt-6">
    <TextScalePicker value={textScale} onChange={handleScaleChange} />
  </div>
</section>
```

**Step 3: Verify**

```bash
pnpm test && pnpm lint && pnpm build
```

All green.

**Step 4: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(ui): Display section in /settings with TextScalePicker"
```

---

## Task 6: Final smoke + PR

**Step 1: Manual smoke**

```bash
pnpm dev
```

1. Sign in. Visit `/settings` → see "Display" section with three buttons; "Standard" active.
2. Click "Large" → all text on the page bumps up immediately. The chip shows pressed state.
3. Refresh `/settings` → still Large. No flash on first paint.
4. Click "Extra-large" → bumps further.
5. Visit `/` and `/nearby` → same scale applies everywhere.
6. Click "Standard" → back to current default.
7. Sign out → sign back in → scale preserved (localStorage outlives auth).

**Step 2: Push**

```bash
git push -u origin feat/large-text-mode
```

**Step 3: Open PR**

```bash
gh pr create --base master \
  --title "feat: large-text mode (Phase 7) — Display section in settings" \
  --body "$(cat <<'EOF'
## Summary
- Adds a "Display" section in \`/settings\` with three text-size options: **Standard** (1.125x → 18 px), **Large** (1.4x → 22.4 px), **Extra-large** (1.625x → 26 px).
- Scaling is global: \`--font-scale\` on \`<html>\` drives \`html { font-size: calc(16px * var(--font-scale)) }\`. Tailwind's \`rem\` sizes scale with it.
- Per-device persistence via \`localStorage\`. No DB change.
- Hydration-safe: an inline \`<script>\` in \`<head>\` reads localStorage synchronously before paint, so the saved size is honoured on first render — no flash.
- Standard option matches the previous default look (18 px).

## Design + plan
- \`docs/plans/2026-05-02-large-text-mode-design.md\`
- \`docs/plans/2026-05-02-large-text-mode.md\`

## What changed
- \`src/lib/display/textScale.ts\` — \`loadTextScale\`, \`saveTextScale\`, \`applyTextScale\`, validated read with safe fallbacks.
- \`src/components/TextScalePicker.tsx\` — three-button group with \`aria-pressed\`.
- \`src/app/globals.css\` — \`:root { --font-scale: 1.125 }\` + \`html { font-size: calc(16px * var(--font-scale)) }\`.
- \`src/app/layout.tsx\` — inline pre-paint init script; drops the now-redundant \`text-[18px]\` arbitrary-value class on \`<body>\`.
- \`src/app/settings/page.tsx\` — new Display section.

## Tests
≈115+ pass (8 new across textScale + TextScalePicker).

## Test plan
- [ ] \`pnpm install && pnpm test\`
- [ ] \`pnpm build\`
- [ ] Sign in → \`/settings\` → toggle Large → all text bumps
- [ ] Refresh → still Large; no flash on first paint
- [ ] Toggle Extra-large → larger still
- [ ] Visit \`/\` and \`/nearby\` → same scale applies
- [ ] Toggle Standard → current default look
- [ ] Sign out + sign back in → preference preserved

## Out of scope
- Touch-target / button-size scaling.
- Contrast / dark mode.
- Reading-width adjustment.
- Phase 6 — voice (STT + TTS).
- Phase 8 — compliance copy.
- Phase 9 — Playwright E2E.
EOF
)"
```

---

## Done definition

- All 6 tasks committed.
- `pnpm test` passes.
- `pnpm build` succeeds.
- Manual smoke confirms the three sizes apply globally and persist.
- PR open against `master`.
