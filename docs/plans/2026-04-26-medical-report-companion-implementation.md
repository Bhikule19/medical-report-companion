# Medical Report Companion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a phone-OTP-authenticated web app where users upload medical reports, get plain-language summaries in 6 languages, chat with a safety-bounded AI grounded in the report, optionally use voice (STT/TTS), and find nearby labs/hospitals — backend-first, UI last.

**Architecture:** Next.js 15 (App Router) frontend + Supabase (Auth + Postgres + Edge Functions) backend. Stateless JWT-authenticated Edge Functions for OCR, translation, chat, voice tokens, and Places proxy. Postgres tables RLS-protected. LLM via OpenRouter (Gemini Flash default), OCR via Google Vision, voice via Deepgram.

**Tech Stack:** TypeScript, Next.js 15, pnpm, Tailwind, shadcn/ui, Zustand, Supabase JS, Deno (Edge Functions), Vitest, Playwright, zod, Google Cloud Vision, Google Translate, Google Places, OpenRouter, Deepgram Nova-3 + Aura.

**Reference design doc:** `docs/plans/2026-04-26-medical-report-companion-design.md`

---

## How to Use This Plan

This plan covers **Phases 0–1 in full TDD detail** — the immediate next work to start building. **Phases 2–9 are task outlines** with key code snippets and tests, intended to be **re-planned in full detail using `writing-plans` when you start each phase**. This avoids a stale 5000-line document and matches the user's "phase-wise MVP" directive.

Each fully-detailed task follows the 5-step pattern: write failing test → run it → implement → run passing test → commit. Each step is 2–5 minutes.

**Frequent commits.** TDD. DRY. YAGNI. Don't add features the design didn't specify.

---

# Phase 0 — Project Scaffold + CI

**Goal:** Empty but green skeleton: Next.js + pnpm + Supabase CLI + Vitest + ESLint + GitHub Actions CI. No features yet.

**Validation:** `pnpm test` runs (zero tests, exits 0). `pnpm build` succeeds. CI green on push.

---

### Task 0.1: Initialize Next.js with pnpm

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`

**Step 1: Run scaffolder**

```bash
cd /Users/abhishekbhikule/medical-report-companion
pnpm create next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
```

Answer prompts: yes to overwriting if asked, default app router. Make sure pnpm is the package manager.

**Step 2: Verify build works**

```bash
pnpm build
```

Expected: `✓ Compiled successfully`. If errors, fix before continuing.

**Step 3: Trim default content**

Delete the contents of `src/app/page.tsx` and replace with:

```tsx
export default function Page() {
  return <main>Medical Report Companion</main>;
}
```

**Step 4: Verify build still works**

```bash
pnpm build
```

Expected: `✓ Compiled successfully`.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js with pnpm and TypeScript"
```

---

### Task 0.2: Add Vitest with a sanity test

**Files:**
- Create: `vitest.config.ts`, `src/lib/__tests__/sanity.test.ts`
- Modify: `package.json`

**Step 1: Install Vitest**

```bash
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

**Step 2: Write the failing test**

Create `src/lib/__tests__/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('arithmetic still works', () => {
    expect(2 + 2).toBe(4);
  });
});
```

**Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Add scripts to `package.json`:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Step 4: Run test**

```bash
pnpm test
```

Expected: `1 passed`.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: add Vitest with sanity test"
```

---

### Task 0.3: Install runtime dependencies

**Files:** Modify `package.json`.

**Step 1: Install**

```bash
pnpm add zustand @supabase/supabase-js zod
pnpm add @vis.gl/react-google-maps
```

**Step 2: Install dev tooling**

```bash
pnpm add -D prettier eslint-config-prettier
```

**Step 3: Configure Prettier**

Create `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

**Step 4: Verify build still passes**

```bash
pnpm build && pnpm test
```

Expected: both pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: install runtime deps and Prettier"
```

---

### Task 0.4: Set up Supabase CLI and local project

**Files:**
- Create: `supabase/config.toml` (auto-generated)

**Step 1: Install Supabase CLI**

```bash
brew install supabase/tap/supabase
supabase --version
```

Expected: version printed.

**Step 2: Initialize Supabase project**

```bash
supabase init
```

This creates `supabase/config.toml` and `supabase/` directory.

**Step 3: Add Supabase to .gitignore**

Append to `.gitignore`:

```
supabase/.branches/
supabase/.temp/
```

**Step 4: Sanity check**

```bash
ls supabase/
```

Expected: `config.toml`, `functions/` (or empty), `migrations/`.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: initialize Supabase CLI project"
```

---

### Task 0.5: Create environment variable template

**Files:**
- Create: `.env.example`, `src/lib/env.ts`

**Step 1: Write `.env.example`**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Cloud
GOOGLE_CLOUD_VISION_API_KEY=
GOOGLE_TRANSLATE_API_KEY=
GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# LLM
OPENROUTER_API_KEY=

# Voice
DEEPGRAM_API_KEY=

# SMS (filled during Phase 3)
SMS_PROVIDER=msg91
SMS_API_KEY=
```

**Step 2: Write the failing env validator test**

Create `src/lib/__tests__/env.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseEnv } from '../env';

describe('parseEnv', () => {
  it('throws when required public vars are missing', () => {
    expect(() => parseEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('returns parsed env when valid', () => {
    const env = parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    });
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://x.supabase.co');
  });
});
```

**Step 3: Run — expect fail**

```bash
pnpm test src/lib/__tests__/env.test.ts
```

Expected: FAIL — `parseEnv` not exported.

**Step 4: Implement**

Create `src/lib/env.ts`:

```ts
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type AppEnv = z.infer<typeof schema>;

export function parseEnv(input: Record<string, string | undefined>): AppEnv {
  return schema.parse(input);
}
```

**Step 5: Run — expect pass**

```bash
pnpm test src/lib/__tests__/env.test.ts
```

Expected: 2 passed.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: env validation with zod"
```

---

### Task 0.6: Stub the medical glossary for 6 languages

**Files:**
- Create: `src/lib/glossary/medical-terms.ts`, `src/lib/glossary/__tests__/medical-terms.test.ts`

**Step 1: Write the failing test**

Create `src/lib/glossary/__tests__/medical-terms.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { glossary, applyGlossary, restoreGlossary } from '../medical-terms';

describe('glossary', () => {
  it('has entries for all 6 languages', () => {
    const langs = ['en', 'hi', 'ta', 'te', 'bn', 'mr'] as const;
    for (const l of langs) expect(glossary[l]).toBeDefined();
  });

  it('replaces medical terms with placeholders before translation', () => {
    const { text, replacements } = applyGlossary('Creatinine is high', 'en');
    expect(text).toMatch(/__GLOSS_\d+__/);
    expect(replacements.length).toBeGreaterThan(0);
  });

  it('restores placeholders to target language terms after translation', () => {
    const { text, replacements } = applyGlossary('Creatinine is high', 'en');
    const translated = text.replace('is high', 'अधिक है');
    const restored = restoreGlossary(translated, replacements, 'hi');
    expect(restored).toContain('क्रिएटिनिन');
  });
});
```

**Step 2: Run — expect fail**

```bash
pnpm test src/lib/glossary
```

Expected: FAIL — module not found.

**Step 3: Implement**

Create `src/lib/glossary/medical-terms.ts`:

```ts
export type Lang = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr';

// Starter set of 10 terms across 6 languages. Grow during Phase 1 evals.
export const glossary: Record<Lang, Record<string, string>> = {
  en: {
    creatinine: 'creatinine',
    haemoglobin: 'haemoglobin',
    cholesterol: 'cholesterol',
    glucose: 'glucose',
    bilirubin: 'bilirubin',
    triglycerides: 'triglycerides',
    platelets: 'platelets',
    leukocytes: 'leukocytes',
    'blood pressure': 'blood pressure',
    'thyroid stimulating hormone': 'thyroid stimulating hormone',
  },
  hi: {
    creatinine: 'क्रिएटिनिन',
    haemoglobin: 'हीमोग्लोबिन',
    cholesterol: 'कोलेस्ट्रॉल',
    glucose: 'ग्लूकोज़',
    bilirubin: 'बिलीरुबिन',
    triglycerides: 'ट्राइग्लिसराइड्स',
    platelets: 'प्लेटलेट्स',
    leukocytes: 'श्वेत रक्त कोशिकाएं',
    'blood pressure': 'रक्तचाप',
    'thyroid stimulating hormone': 'थायरॉइड उत्तेजक हार्मोन',
  },
  ta: {
    creatinine: 'கிரியேட்டினின்',
    haemoglobin: 'ஹீமோகுளோபின்',
    cholesterol: 'கொலஸ்ட்ரால்',
    glucose: 'குளுக்கோஸ்',
    bilirubin: 'பிலிரூபின்',
    triglycerides: 'ட்ரைகிளிசரைடுகள்',
    platelets: 'தட்டுச்செல்கள்',
    leukocytes: 'வெள்ளை இரத்த அணுக்கள்',
    'blood pressure': 'இரத்த அழுத்தம்',
    'thyroid stimulating hormone': 'தைராய்டு தூண்டும் ஹார்மோன்',
  },
  te: {
    creatinine: 'క్రియాటినిన్',
    haemoglobin: 'హిమోగ్లోబిన్',
    cholesterol: 'కొలెస్ట్రాల్',
    glucose: 'గ్లూకోజ్',
    bilirubin: 'బిలిరుబిన్',
    triglycerides: 'ట్రైగ్లిజరైడ్లు',
    platelets: 'ప్లేట్లెట్లు',
    leukocytes: 'ల్యూకోసైట్లు',
    'blood pressure': 'రక్తపోటు',
    'thyroid stimulating hormone': 'థైరాయిడ్ ఉత్తేజక హార్మోన్',
  },
  bn: {
    creatinine: 'ক্রিয়েটিনিন',
    haemoglobin: 'হিমোগ্লোবিন',
    cholesterol: 'কোলেস্টেরল',
    glucose: 'গ্লুকোজ',
    bilirubin: 'বিলিরুবিন',
    triglycerides: 'ট্রাইগ্লিসারাইড',
    platelets: 'প্লেটলেট',
    leukocytes: 'শ্বেত রক্তকণিকা',
    'blood pressure': 'রক্তচাপ',
    'thyroid stimulating hormone': 'থাইরয়েড উদ্দীপক হরমোন',
  },
  mr: {
    creatinine: 'क्रिएटिनिन',
    haemoglobin: 'हिमोग्लोबिन',
    cholesterol: 'कोलेस्टेरॉल',
    glucose: 'ग्लुकोज',
    bilirubin: 'बिलीरुबिन',
    triglycerides: 'ट्रायग्लिसराइड्स',
    platelets: 'प्लेटलेट्स',
    leukocytes: 'पांढऱ्या पेशी',
    'blood pressure': 'रक्तदाब',
    'thyroid stimulating hormone': 'थायरॉइड उत्तेजक संप्रेरक',
  },
};

export interface GlossaryReplacement {
  placeholder: string;
  englishKey: string;
}

export function applyGlossary(
  text: string,
  sourceLang: Lang,
): { text: string; replacements: GlossaryReplacement[] } {
  const sourceTerms = glossary[sourceLang];
  const replacements: GlossaryReplacement[] = [];
  let result = text;
  let counter = 0;
  for (const [englishKey, sourceTerm] of Object.entries(sourceTerms)) {
    const re = new RegExp(`\\b${sourceTerm}\\b`, 'gi');
    result = result.replace(re, () => {
      const placeholder = `__GLOSS_${counter}__`;
      replacements.push({ placeholder, englishKey });
      counter += 1;
      return placeholder;
    });
  }
  return { text: result, replacements };
}

export function restoreGlossary(
  text: string,
  replacements: GlossaryReplacement[],
  targetLang: Lang,
): string {
  const target = glossary[targetLang];
  let result = text;
  for (const r of replacements) {
    const targetTerm = target[r.englishKey] ?? r.englishKey;
    result = result.split(r.placeholder).join(targetTerm);
  }
  return result;
}
```

**Step 4: Run — expect pass**

```bash
pnpm test src/lib/glossary
```

Expected: 3 passed.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: medical glossary for 6 languages with placeholder injection"
```

---

### Task 0.7: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

**Step 2: Sanity-check locally**

```bash
pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build
```

Expected: all four pass.

**Step 3: Commit**

```bash
git add -A
git commit -m "ci: GitHub Actions for lint, test, build"
```

---

### Task 0.8: Verify Phase 0 Complete

**Step 1: Run the full local CI**

```bash
pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build
```

Expected: green on all four.

**Step 2: Confirm structure**

```bash
ls -la
```

Expected to see: `src/`, `supabase/`, `docs/`, `.github/`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `.env.example`, `.gitignore`, `.prettierrc.json`, `README.md`.

**Step 3: Commit (if any leftover changes)**

```bash
git status
git add -A && git commit -m "chore: Phase 0 complete" || echo "nothing to commit"
```

---

# Phase 1 — `/ocr-translate` Edge Function

**Goal:** Stateless Deno Edge Function that accepts a file (PDF or image) + target language, returns extracted text in original and translated forms. No DB, no auth yet.

**Validation:**
- `deno test supabase/functions/ocr-translate` — all unit tests pass
- `supabase functions serve` running, then `curl` against fixture PDFs returns expected shape
- OCR accuracy >95% on digital fixture, >85% on phone-photo fixture

---

### Task 1.1: Set up Edge Function skeleton

**Files:**
- Create: `supabase/functions/ocr-translate/index.ts`, `supabase/functions/_shared/cors.ts`

**Step 1: Create CORS shared module**

`supabase/functions/_shared/cors.ts`:

```ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // tighten before deploy
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Step 2: Create function skeleton**

`supabase/functions/ocr-translate/index.ts`:

```ts
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ status: 'not_implemented' }), {
    status: 501,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

**Step 3: Serve and curl-test**

```bash
supabase functions serve ocr-translate --no-verify-jwt
```

In another terminal:

```bash
curl -i -X POST http://127.0.0.1:54321/functions/v1/ocr-translate
```

Expected: `HTTP/1.1 501` with `{"status":"not_implemented"}`.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(ocr-translate): skeleton with CORS"
```

---

### Task 1.2: Add request validation with zod

**Files:**
- Create: `supabase/functions/_shared/validate.ts`, `supabase/functions/ocr-translate/validate.test.ts`

**Step 1: Write the failing test**

`supabase/functions/ocr-translate/validate.test.ts`:

```ts
import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ocrRequestSchema } from '../_shared/validate.ts';

Deno.test('rejects missing target_language', () => {
  assertThrows(() => ocrRequestSchema.parse({}));
});

Deno.test('accepts valid target_language', () => {
  const v = ocrRequestSchema.parse({ target_language: 'hi' });
  assertEquals(v.target_language, 'hi');
});

Deno.test('rejects invalid language code', () => {
  assertThrows(() => ocrRequestSchema.parse({ target_language: 'xx' }));
});
```

**Step 2: Run — expect fail**

```bash
deno test --allow-all supabase/functions/ocr-translate/validate.test.ts
```

Expected: import error (module missing).

**Step 3: Implement**

`supabase/functions/_shared/validate.ts`:

```ts
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

export const langSchema = z.enum(['en', 'hi', 'ta', 'te', 'bn', 'mr']);

export const ocrRequestSchema = z.object({
  target_language: langSchema,
});

export type OcrRequest = z.infer<typeof ocrRequestSchema>;
```

**Step 4: Run — expect pass**

```bash
deno test --allow-all supabase/functions/ocr-translate/validate.test.ts
```

Expected: 3 passed.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(ocr-translate): zod validation for request body"
```

---

### Task 1.3: File size and type guard

**Files:**
- Create: `supabase/functions/ocr-translate/file-guard.ts`, `supabase/functions/ocr-translate/file-guard.test.ts`

**Step 1: Write the failing tests**

`supabase/functions/ocr-translate/file-guard.test.ts`:

```ts
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { validateFile } from './file-guard.ts';

Deno.test('rejects file >10MB', () => {
  const r = validateFile({ size: 11 * 1024 * 1024, type: 'application/pdf' });
  assert(!r.ok);
  assertEquals(r.error, 'file_too_large');
});

Deno.test('rejects unsupported type', () => {
  const r = validateFile({ size: 1000, type: 'text/plain' });
  assert(!r.ok);
  assertEquals(r.error, 'unsupported_type');
});

Deno.test('accepts valid PDF under 10MB', () => {
  const r = validateFile({ size: 5 * 1024 * 1024, type: 'application/pdf' });
  assert(r.ok);
});

Deno.test('accepts JPEG and PNG', () => {
  for (const t of ['image/jpeg', 'image/png']) {
    const r = validateFile({ size: 100_000, type: t });
    assert(r.ok, `should accept ${t}`);
  }
});
```

**Step 2: Run — expect fail**

```bash
deno test --allow-all supabase/functions/ocr-translate/file-guard.test.ts
```

Expected: import error.

**Step 3: Implement**

`supabase/functions/ocr-translate/file-guard.ts`:

```ts
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export type GuardResult = { ok: true } | { ok: false; error: string };

export function validateFile(meta: { size: number; type: string }): GuardResult {
  if (meta.size > MAX_BYTES) return { ok: false, error: 'file_too_large' };
  if (!ALLOWED.has(meta.type)) return { ok: false, error: 'unsupported_type' };
  return { ok: true };
}
```

**Step 4: Run — expect pass**

```bash
deno test --allow-all supabase/functions/ocr-translate/file-guard.test.ts
```

Expected: 4 passed.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(ocr-translate): file size and type guard"
```

---

### Task 1.4: Digital-PDF detection and extraction

**Files:**
- Create: `supabase/functions/ocr-translate/pdf.ts`, `supabase/functions/ocr-translate/pdf.test.ts`
- Add fixture: `tests/fixtures/digital-en.pdf` (small 1-page PDF with selectable text — generate from a public lab template with fake values)

**Step 1: Write the failing test**

`supabase/functions/ocr-translate/pdf.test.ts`:

```ts
import { assert, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { extractDigitalPdfText, isDigitalPdf } from './pdf.ts';

Deno.test('extractDigitalPdfText returns text from a digital PDF', async () => {
  const bytes = await Deno.readFile('tests/fixtures/digital-en.pdf');
  const text = await extractDigitalPdfText(bytes);
  assert(text.length > 0);
  assertStringIncludes(text.toLowerCase(), 'haemoglobin');
});

Deno.test('isDigitalPdf returns true for PDFs with extractable text', async () => {
  const bytes = await Deno.readFile('tests/fixtures/digital-en.pdf');
  assert(await isDigitalPdf(bytes));
});
```

**Step 2: Run — expect fail**

```bash
deno test --allow-all supabase/functions/ocr-translate/pdf.test.ts
```

Expected: import error.

**Step 3: Implement**

`supabase/functions/ocr-translate/pdf.ts`:

```ts
import { getDocument } from 'https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs';

export async function extractDigitalPdfText(bytes: Uint8Array): Promise<string> {
  const doc = await getDocument({ data: bytes }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((it: { str: string }) => it.str).join(' '));
  }
  return parts.join('\n').trim();
}

export async function isDigitalPdf(bytes: Uint8Array): Promise<boolean> {
  const text = await extractDigitalPdfText(bytes);
  return text.length > 50; // heuristic: scanned PDFs return little/no text
}
```

**Step 4: Run — expect pass**

```bash
deno test --allow-all supabase/functions/ocr-translate/pdf.test.ts
```

Expected: 2 passed.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(ocr-translate): digital PDF text extraction with pdfjs"
```

---

### Task 1.5: Google Vision integration (with mock-friendly client)

**Files:**
- Create: `supabase/functions/ocr-translate/vision.ts`, `supabase/functions/ocr-translate/vision.test.ts`

**Step 1: Write the failing test (mocked HTTP)**

`supabase/functions/ocr-translate/vision.test.ts`:

```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ocrViaVision } from './vision.ts';

Deno.test('parses Vision DOCUMENT_TEXT_DETECTION response', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        responses: [{ fullTextAnnotation: { text: 'Haemoglobin: 13.5 g/dL' } }],
      }),
      { status: 200 },
    );
  const text = await ocrViaVision(new Uint8Array([1, 2, 3]), 'image/png', {
    apiKey: 'test',
    fetchImpl: fakeFetch,
  });
  assertEquals(text, 'Haemoglobin: 13.5 g/dL');
});

Deno.test('throws on Vision error response', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'quota' } }), { status: 429 });
  let caught: unknown;
  try {
    await ocrViaVision(new Uint8Array([1]), 'image/png', {
      apiKey: 'test',
      fetchImpl: fakeFetch,
    });
  } catch (e) {
    caught = e;
  }
  assertEquals((caught as Error).message.includes('vision_failed'), true);
});
```

**Step 2: Run — expect fail**

```bash
deno test --allow-all supabase/functions/ocr-translate/vision.test.ts
```

Expected: import error.

**Step 3: Implement**

`supabase/functions/ocr-translate/vision.ts`:

```ts
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

export interface VisionDeps {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export async function ocrViaVision(
  bytes: Uint8Array,
  _mimeType: string,
  deps: VisionDeps,
): Promise<string> {
  const f = deps.fetchImpl ?? fetch;
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${deps.apiKey}`;
  const body = {
    requests: [
      {
        image: { content: encodeBase64(bytes) },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      },
    ],
  };
  const res = await f(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`vision_failed: ${res.status}`);
  const json = await res.json();
  return json.responses?.[0]?.fullTextAnnotation?.text ?? '';
}
```

**Step 4: Run — expect pass**

```bash
deno test --allow-all supabase/functions/ocr-translate/vision.test.ts
```

Expected: 2 passed.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(ocr-translate): Google Vision integration with injectable fetch"
```

---

### Task 1.6: Translation with glossary placeholder round-trip

**Files:**
- Create: `supabase/functions/ocr-translate/translate.ts`, `supabase/functions/ocr-translate/translate.test.ts`
- Mirror glossary into Edge Function: `supabase/functions/_shared/glossary.ts` (copy of `src/lib/glossary/medical-terms.ts` adapted to Deno imports)

**Step 1: Mirror glossary**

Copy `src/lib/glossary/medical-terms.ts` to `supabase/functions/_shared/glossary.ts`. Adapt zod imports to Deno equivalents if any. Add a unit test on the Deno side that mirrors `medical-terms.test.ts`.

**Step 2: Write the failing test**

`supabase/functions/ocr-translate/translate.test.ts`:

```ts
import { assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { translateWithGlossary } from './translate.ts';

Deno.test('preserves medical terms via glossary', async () => {
  const fakeFetch: typeof fetch = async (_, init) => {
    const body = JSON.parse(init!.body as string);
    // Echo the input but localised
    const replaced = body.q[0].replace(/is high/g, 'अधिक है');
    return new Response(
      JSON.stringify({ data: { translations: [{ translatedText: replaced }] } }),
      { status: 200 },
    );
  };
  const result = await translateWithGlossary('Creatinine is high', 'en', 'hi', {
    apiKey: 'test',
    fetchImpl: fakeFetch,
  });
  assertStringIncludes(result, 'क्रिएटिनिन');
});
```

**Step 3: Run — expect fail**

```bash
deno test --allow-all supabase/functions/ocr-translate/translate.test.ts
```

Expected: import error.

**Step 4: Implement**

`supabase/functions/ocr-translate/translate.ts`:

```ts
import { applyGlossary, restoreGlossary, type Lang } from '../_shared/glossary.ts';

export interface TranslateDeps {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export async function translateWithGlossary(
  text: string,
  source: Lang,
  target: Lang,
  deps: TranslateDeps,
): Promise<string> {
  if (source === target) return text;
  const f = deps.fetchImpl ?? fetch;
  const { text: protected_, replacements } = applyGlossary(text, source);
  const url = `https://translation.googleapis.com/language/translate/v2?key=${deps.apiKey}`;
  const res = await f(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: [protected_], source, target, format: 'text' }),
  });
  if (!res.ok) throw new Error(`translate_failed: ${res.status}`);
  const json = await res.json();
  const translated = json.data.translations[0].translatedText as string;
  return restoreGlossary(translated, replacements, target);
}
```

**Step 5: Run — expect pass**

```bash
deno test --allow-all supabase/functions/ocr-translate/translate.test.ts
```

Expected: 1 passed.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(ocr-translate): Translate with glossary placeholder round-trip"
```

---

### Task 1.7: Source-language detection

**Files:**
- Create: `supabase/functions/ocr-translate/detect-lang.ts`, `supabase/functions/ocr-translate/detect-lang.test.ts`

**Step 1: Write the failing test**

```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { detectLanguage } from './detect-lang.ts';

Deno.test('detects English from Google Translate detect endpoint', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ data: { detections: [[{ language: 'en' }]] } }), {
      status: 200,
    });
  const lang = await detectLanguage('Haemoglobin is normal', {
    apiKey: 'test',
    fetchImpl: fakeFetch,
  });
  assertEquals(lang, 'en');
});

Deno.test('falls back to en when detection unsupported', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ data: { detections: [[{ language: 'xx' }]] } }), {
      status: 200,
    });
  const lang = await detectLanguage('text', { apiKey: 'test', fetchImpl: fakeFetch });
  assertEquals(lang, 'en');
});
```

**Step 2: Run — expect fail**

```bash
deno test --allow-all supabase/functions/ocr-translate/detect-lang.test.ts
```

Expected: import error.

**Step 3: Implement**

```ts
import type { Lang } from '../_shared/glossary.ts';

const SUPPORTED: ReadonlySet<Lang> = new Set(['en', 'hi', 'ta', 'te', 'bn', 'mr']);

export async function detectLanguage(
  text: string,
  deps: { apiKey: string; fetchImpl?: typeof fetch },
): Promise<Lang> {
  const f = deps.fetchImpl ?? fetch;
  const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${deps.apiKey}`;
  const res = await f(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: [text.slice(0, 500)] }),
  });
  if (!res.ok) return 'en';
  const json = await res.json();
  const code = json.data?.detections?.[0]?.[0]?.language;
  return SUPPORTED.has(code) ? (code as Lang) : 'en';
}
```

**Step 4: Run — expect pass**

```bash
deno test --allow-all supabase/functions/ocr-translate/detect-lang.test.ts
```

Expected: 2 passed.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(ocr-translate): source language detection"
```

---

### Task 1.8: Wire the orchestrator end-to-end

**Files:**
- Modify: `supabase/functions/ocr-translate/index.ts`
- Create: `supabase/functions/ocr-translate/orchestrate.ts`, `supabase/functions/ocr-translate/orchestrate.test.ts`

**Step 1: Write the integration-style test**

`supabase/functions/ocr-translate/orchestrate.test.ts`:

```ts
import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { orchestrate } from './orchestrate.ts';

Deno.test('digital-PDF path returns parsed and translated text', async () => {
  const bytes = await Deno.readFile('tests/fixtures/digital-en.pdf');
  const result = await orchestrate({
    bytes,
    mimeType: 'application/pdf',
    targetLang: 'hi',
    deps: {
      visionApiKey: 'unused',
      translateApiKey: 'unused',
      visionFetch: async () => new Response('{}', { status: 200 }),
      translateFetch: async (_, init) => {
        const body = JSON.parse(init!.body as string);
        if ((body as { q?: string[] }).q) {
          return new Response(
            JSON.stringify({
              data: { translations: [{ translatedText: 'hindi placeholder text' }] },
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({ data: { detections: [[{ language: 'en' }]] } }),
          { status: 200 },
        );
      },
    },
  });
  assertEquals(result.source_language, 'en');
  assertEquals(result.target_language, 'hi');
  assert(result.original_text.length > 0);
  assert(result.translated_text.length > 0);
});
```

**Step 2: Run — expect fail**

```bash
deno test --allow-all supabase/functions/ocr-translate/orchestrate.test.ts
```

Expected: import error.

**Step 3: Implement**

`supabase/functions/ocr-translate/orchestrate.ts`:

```ts
import { detectLanguage } from './detect-lang.ts';
import { extractDigitalPdfText, isDigitalPdf } from './pdf.ts';
import { ocrViaVision } from './vision.ts';
import { translateWithGlossary } from './translate.ts';
import type { Lang } from '../_shared/glossary.ts';

export interface OrchestrateInput {
  bytes: Uint8Array;
  mimeType: string;
  targetLang: Lang;
  deps: {
    visionApiKey: string;
    translateApiKey: string;
    visionFetch?: typeof fetch;
    translateFetch?: typeof fetch;
  };
}

export interface OrchestrateResult {
  original_text: string;
  translated_text: string;
  source_language: Lang;
  target_language: Lang;
  page_count: number | null;
}

export async function orchestrate(input: OrchestrateInput): Promise<OrchestrateResult> {
  const { bytes, mimeType, targetLang, deps } = input;
  let original = '';
  let pageCount: number | null = null;

  if (mimeType === 'application/pdf') {
    if (await isDigitalPdf(bytes)) {
      original = await extractDigitalPdfText(bytes);
    } else {
      original = await ocrViaVision(bytes, mimeType, {
        apiKey: deps.visionApiKey,
        fetchImpl: deps.visionFetch,
      });
    }
  } else {
    original = await ocrViaVision(bytes, mimeType, {
      apiKey: deps.visionApiKey,
      fetchImpl: deps.visionFetch,
    });
  }

  const source = await detectLanguage(original, {
    apiKey: deps.translateApiKey,
    fetchImpl: deps.translateFetch,
  });

  const translated =
    source === targetLang
      ? original
      : await translateWithGlossary(original, source, targetLang, {
          apiKey: deps.translateApiKey,
          fetchImpl: deps.translateFetch,
        });

  return {
    original_text: original,
    translated_text: translated,
    source_language: source,
    target_language: targetLang,
    page_count: pageCount,
  };
}
```

**Step 4: Wire into the HTTP handler**

Replace `supabase/functions/ocr-translate/index.ts`:

```ts
import { corsHeaders } from '../_shared/cors.ts';
import { ocrRequestSchema } from '../_shared/validate.ts';
import { validateFile } from './file-guard.ts';
import { orchestrate } from './orchestrate.ts';

const visionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')!;
const translateApiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }
  try {
    const form = await req.formData();
    const file = form.get('file');
    const targetLanguageRaw = form.get('target_language');
    if (!(file instanceof File)) return json({ error: 'missing_file' }, 400);
    const guard = validateFile({ size: file.size, type: file.type });
    if (!guard.ok) return json({ error: guard.error }, 400);
    const parsed = ocrRequestSchema.safeParse({ target_language: targetLanguageRaw });
    if (!parsed.success) return json({ error: 'invalid_target_language' }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await orchestrate({
      bytes,
      mimeType: file.type,
      targetLang: parsed.data.target_language,
      deps: { visionApiKey, translateApiKey },
    });
    return json(result, 200);
  } catch (e) {
    console.error('ocr-translate error', { message: (e as Error).message });
    return json({ error: 'internal_error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

**Step 5: Run all Phase 1 tests**

```bash
deno test --allow-all supabase/functions/ocr-translate
```

Expected: all green.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(ocr-translate): wire orchestrator end-to-end"
```

---

### Task 1.9: Per-IP rate limiting

**Files:**
- Create: `supabase/functions/_shared/ratelimit.ts`, `supabase/functions/_shared/ratelimit.test.ts`

**Step 1: Write the failing test**

```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createRateLimiter } from './ratelimit.ts';

Deno.test('allows up to N requests per window', () => {
  const rl = createRateLimiter({ limit: 3, windowMs: 60_000 });
  for (let i = 0; i < 3; i++) assertEquals(rl.check('1.1.1.1').allowed, true);
  assertEquals(rl.check('1.1.1.1').allowed, false);
});

Deno.test('isolates by key', () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
  assertEquals(rl.check('a').allowed, true);
  assertEquals(rl.check('b').allowed, true);
  assertEquals(rl.check('a').allowed, false);
});
```

**Step 2: Run — expect fail**

```bash
deno test --allow-all supabase/functions/_shared/ratelimit.test.ts
```

Expected: import error.

**Step 3: Implement (in-memory; documented limitation: per-instance)**

```ts
export function createRateLimiter(opts: { limit: number; windowMs: number }) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key: string) {
      const now = Date.now();
      const b = buckets.get(key);
      if (!b || b.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        return { allowed: true, remaining: opts.limit - 1 };
      }
      if (b.count >= opts.limit) return { allowed: false, remaining: 0 };
      b.count += 1;
      return { allowed: true, remaining: opts.limit - b.count };
    },
  };
}
```

**Step 4: Wire into the handler**

In `supabase/functions/ocr-translate/index.ts`, before the orchestrate call:

```ts
import { createRateLimiter } from '../_shared/ratelimit.ts';
const rl = createRateLimiter({ limit: 5, windowMs: 60_000 });
// inside handler:
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
if (!rl.check(ip).allowed) return json({ error: 'rate_limited' }, 429);
```

**Step 5: Run tests + serve + manual curl flood**

```bash
deno test --allow-all supabase/functions/_shared/ratelimit.test.ts
```

Expected: 2 passed.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(ocr-translate): per-IP rate limiting (5/min)"
```

---

### Task 1.10: End-to-end curl validation against deployed function

**Step 1: Deploy to Supabase project**

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set GOOGLE_CLOUD_VISION_API_KEY=<key> GOOGLE_TRANSLATE_API_KEY=<key>
supabase functions deploy ocr-translate --no-verify-jwt
```

**Step 2: Curl the deployed function**

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/ocr-translate" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -F "file=@tests/fixtures/digital-en.pdf" \
  -F "target_language=hi"
```

Expected: 200 JSON with `original_text`, `translated_text` (Hindi), `source_language: "en"`, `target_language: "hi"`.

**Step 3: Try invalid cases**

- 11 MB file → 400 `file_too_large`
- `.txt` file → 400 `unsupported_type`
- 6 rapid requests → 6th returns 429
- Missing `target_language` → 400 `invalid_target_language`

**Step 4: Commit any deploy-script tweaks**

```bash
git add -A
git commit -m "chore: Phase 1 deployed and validated"
```

---

# Phase 2 — `/chat` Edge Function (outline)

**Re-plan in detail with `writing-plans` when starting.** Tasks expected:

1. Skeleton with CORS + zod validation (mode: `summary | chat`).
2. Prompt builder with language-aware system prompt (no diagnosis / no prescription rule).
3. OpenRouter client with model fallback chain (`gemini-2.0-flash` → `claude-haiku-4-5`).
4. SSE streaming response handler.
5. Medical-advice post-process safety check (regex for prescription patterns).
6. Token-budget trimmer for long histories (preserve report; drop oldest messages).
7. Rate limiter (30/min).
8. Wire end-to-end + curl-validate streaming.
9. Safety eval suite (30 jailbreak prompts must be refused).

**Key file targets:**
- `supabase/functions/chat/index.ts`
- `supabase/functions/chat/prompt.ts` — `buildSummaryPrompt(lang, reportText)`, `buildChatPrompt(lang, reportText, history, question)`
- `supabase/functions/chat/llm.ts` — OpenRouter wrapper, streaming, fallback
- `supabase/functions/chat/safety.ts` — `containsPrescriptionPattern(text)`, footer appender
- `tests/safety/jailbreaks.json` — curated prompts

**Validation gate before Phase 3:** safety eval 30/30 refused; grounding eval >90% answers cite report values; streaming response visible via curl.

---

# Phase 3 — Supabase Auth + DB Schema + RLS (outline)

**Re-plan in detail with `writing-plans` when starting.** Tasks expected:

1. Migration `0001_init.sql`: `profiles`, `reports`, `messages`, `consents` tables with check constraints + indexes.
2. RLS policies on all four tables (`user_id = auth.uid()` + `report_id` chain for messages).
3. Test harness for RLS: spin up two Supabase test users, attempt cross-user reads/writes/updates/deletes — all must 403/return zero rows.
4. JWT verification helper in `_shared/auth.ts`.
5. Update `/ocr-translate` to require JWT and (when `consents.store_reports=true`) insert a `reports` row.
6. Update `/chat` to require JWT, load report by `report_id` (RLS-scoped), and (when `consents.store_chat=true`) persist messages.
7. Configure Supabase Auth: phone OTP provider (MSG91 — pick during this phase), Google OAuth provider.
8. Create consent screen + profile-creation server-side trigger or app-side bootstrap.

**Key file targets:**
- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_rls.sql`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/supabase.ts` — service-role client for `_shared` use
- `tests/integration/rls.test.ts`

**Validation gate:** RLS test suite 100% green; unauthenticated calls to `/ocr-translate` and `/chat` return 401; consent toggle off causes zero new rows.

---

# Phase 4 — Reports CRUD + Consent Gating (outline)

**Re-plan in detail with `writing-plans` when starting.** Tasks expected:

1. `reports/list/index.ts` — paginated list, RLS-scoped, returns `{ id, title, target_lang, page_count, created_at }`.
2. `reports/get/index.ts` — single report + messages.
3. `reports/delete/index.ts` — DELETE row → cascades to messages.
4. `consents/get` + `consents/update` endpoints (or use Supabase JS client directly from frontend with RLS — preferred to skip dedicated endpoints).
5. Consent revocation handling: when `store_chat` flips false → optional cascade delete of `messages`.
6. Integration tests covering each endpoint with two users.

**Validation gate:** two-user isolation tests green; consent revocation deletes existing rows when user opts in.

---

# Phase 5 — `/places` Edge Function (outline)

**Re-plan in detail with `writing-plans` when starting.** Tasks expected:

1. zod schema for `{ lat, lng, category, radius_m }`.
2. Google Places Nearby Search proxy with category mapping (`lab` → `medical_lab`, `hospital` → `hospital`, `pharmacy` → `pharmacy`).
3. Distance calculation (Haversine) + sort.
4. Rate limiter (20/min).
5. Test with mocked Places fetch.

**Validation gate:** curl with sample lat/lng returns ≥1 result; bad category returns 400.

---

# Phase 6 — `/deepgram-token` + Voice Transcript Persistence (outline)

**Re-plan in detail with `writing-plans` when starting.** Tasks expected:

1. `deepgram-token/index.ts` — mints short-lived (60s) Deepgram token, scope=STT or TTS based on body.
2. `voice_input` flag on `messages` rows for transcripts.
3. `/chat` accepts `voice_input: true` flag and (if `consents.store_voice_transcripts=true`) persists with the flag.
4. Test that transcripts are not stored when consent is off.

**Validation gate:** token issuance works; consent gate verified.

---

# Phase 7 — Account Delete + Export (outline)

**Re-plan in detail with `writing-plans` when starting.** Tasks expected:

1. `account/export/index.ts` — return JSON with `{ profile, reports, messages, consents }` for current user.
2. `account/delete/index.ts` — transactional wipe of all user data + auth user (via Supabase admin API).
3. Integration test: create-then-delete leaves zero orphan rows in any table.
4. Reconfirm flow: account delete requires phone OTP re-auth.

**Validation gate:** post-delete query of all four tables returns zero rows for the user; auth.users row also gone.

---

# Phase 8 — Minimal Next.js UI (outline)

**Re-plan in detail with `writing-plans` when starting.** Tasks expected:

1. Auth pages: `/login`, `/verify` (phone OTP entry, Google OAuth button).
2. Consent screen on first signup.
3. Upload page with language picker + file dropper.
4. Session page: report summary (streamed) + chat panel + voice button + map button.
5. History page: list cards.
6. Settings page: consent toggles, delete account, export data.
7. Auth guard wrapper.
8. Zustand stores wired up.

**UI is intentionally unstyled** — focus on functionality. shadcn/ui defaults only. No bespoke design.

**Validation gate:** all happy-path flows work in browser end-to-end.

---

# Phase 9 — E2E + RLS + Safety Evals + Compliance Close-out (outline)

**Re-plan in detail with `writing-plans` when starting.** Tasks expected:

1. Playwright setup; 10 critical E2E journeys.
2. RLS test suite green in CI.
3. Safety eval suite green in CI.
4. Quality eval scripts (OCR accuracy, BLEU/chrF) — run on demand, results checked in.
5. Privacy policy page + ToS page.
6. Confirm encryption-at-rest enabled in Supabase project settings.
7. Verify CORS locked to deployed origin.
8. Verify no Sentry/log destinations receive scrubbed report content (run a probe).
9. Cut a v1.0 tag.

**Ship gate:** all CI green; compliance checklist 100% on MVP must-haves.

---

# Cross-cutting Conventions

- **Commit cadence:** every passing test is a commit. Don't batch.
- **Conventional commits:** `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`.
- **No `any`:** use `unknown` and narrow.
- **No mutation of inputs:** always return new objects.
- **No logging of report or chat content:** ever, even on error. Log only metadata.
- **Files <400 lines:** split when approaching.
- **DI for testability:** all external HTTP calls accept an injectable `fetchImpl` for unit tests.

---

## What "done" looks like for each phase

A phase is done when:

1. All listed tasks are committed.
2. The phase's validation gate passes.
3. CI is green.
4. A short note is appended to this plan describing what changed (e.g., glossary expanded, prompt tweaks).

Re-plan the next phase with `writing-plans` before starting it.
