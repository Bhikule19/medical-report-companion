# Upload + Summary + Chat UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first user-facing page of medical-report-companion: upload a medical document, watch a plain-language summary stream in, then chat with follow-up questions — all wired to the already-deployed Edge Functions.

**Architecture:** Single client-rendered Next.js page at `/`, no API routes. The frontend talks directly to Supabase Edge Functions using the public anon key. Two API client modules (`ocrTranslate`, `chat`) accept an injectable `fetchImpl` for unit testing without real network. State lives in a small Zustand store. SSE consumed via `ReadableStream` + `TextDecoder` with a line buffer. Plain Tailwind v3 styling — no shadcn install.

**Tech Stack:** Next.js 15.5.15 (App Router) · React 19 · TypeScript · Tailwind v3 · Zustand 5 · zod 4 · Vitest 4 · @testing-library/react · jsdom.

**Reference:** Design doc at `docs/plans/2026-05-02-upload-summary-chat-ui-design.md`. Edge Function contracts:
- `POST /functions/v1/ocr-translate` — multipart `file` + `target_language` → `{ original_text, translated_text, source_language, target_language, page_count }`. 429 includes `Retry-After`.
- `POST /functions/v1/chat` — JSON `{ mode: "summary"|"chat", report_text, target_language, history?, question? }` → `text/event-stream` of `data: {chunk?, footer?, done?, error?}\n\n` lines.

---

## Task 1: Shared types

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Write the type module**

```typescript
// src/lib/types.ts
export type Language = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
];

export interface Report {
  originalText: string;
  pageCount: number | null;
  sourceLang: Language;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OcrResponse {
  original_text: string;
  translated_text: string;
  source_language: Language;
  target_language: Language;
  page_count: number | null;
}

export type ChatStreamEvent =
  | { kind: 'chunk'; text: string }
  | { kind: 'footer'; text: string }
  | { kind: 'done' }
  | { kind: 'error'; message: string };
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): shared frontend types for language, report, chat"
```

---

## Task 2: Env-var helper

**Files:**
- Create: `src/lib/env.ts`
- Test: `src/lib/env.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/env.test.ts
import { describe, it, expect } from 'vitest';
import { getSupabaseConfig } from './env';

describe('getSupabaseConfig', () => {
  it('returns url and key when both present', () => {
    const cfg = getSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'abc',
    });
    expect(cfg).toEqual({ url: 'https://x.supabase.co', anonKey: 'abc' });
  });

  it('throws when url is missing', () => {
    expect(() =>
      getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'abc' }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('throws when key is missing', () => {
    expect(() =>
      getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
```

**Step 2: Run test → FAIL**

```
pnpm test -- src/lib/env.test.ts
```

Expected: cannot find module `./env`.

**Step 3: Implementation**

```typescript
// src/lib/env.ts
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(
  source: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): SupabaseConfig {
  const url = source.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = source.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured');
  return { url, anonKey };
}
```

**Step 4: Run test → PASS**

**Step 5: Commit**

```bash
git add src/lib/env.ts src/lib/env.test.ts
git commit -m "feat(env): typed Supabase config loader with explicit errors"
```

---

## Task 3: ocrTranslate API client — happy path

**Files:**
- Create: `src/lib/api/ocrTranslate.ts`
- Test: `src/lib/api/ocrTranslate.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/api/ocrTranslate.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ocrTranslate } from './ocrTranslate';

const config = { url: 'https://x.supabase.co', anonKey: 'anon' };

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('ocrTranslate happy path', () => {
  it('posts multipart form-data and returns parsed result', async () => {
    const file = new File(['hi'], 'r.pdf', { type: 'application/pdf' });
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        original_text: 'Patient John',
        translated_text: 'मरीज जॉन',
        source_language: 'en',
        target_language: 'hi',
        page_count: 1,
      }),
    );

    const result = await ocrTranslate({
      file,
      targetLang: 'hi',
      config,
      fetchImpl,
    });

    expect(result.original_text).toBe('Patient John');
    expect(result.page_count).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://x.supabase.co/functions/v1/ocr-translate');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get('Authorization')).toBe('Bearer anon');
    expect(headers.get('apikey')).toBe('anon');
  });
});
```

**Step 2: Run test → FAIL** (`pnpm test -- src/lib/api/ocrTranslate.test.ts`).

**Step 3: Implementation**

```typescript
// src/lib/api/ocrTranslate.ts
import type { Language, OcrResponse } from '../types';
import type { SupabaseConfig } from '../env';

export interface OcrTranslateInput {
  file: File;
  targetLang: Language;
  config: SupabaseConfig;
  fetchImpl?: typeof fetch;
}

export class OcrError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'OcrError';
  }
}

export async function ocrTranslate(input: OcrTranslateInput): Promise<OcrResponse> {
  const fetchFn = input.fetchImpl ?? fetch;
  const form = new FormData();
  form.append('file', input.file);
  form.append('target_language', input.targetLang);

  const res = await fetchFn(`${input.config.url}/functions/v1/ocr-translate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.config.anonKey}`,
      apikey: input.config.anonKey,
    },
    body: form,
  });

  if (!res.ok) {
    const retryAfter = res.headers.get('Retry-After');
    const body = await safeJson(res);
    throw new OcrError(
      typeof body?.error === 'string' ? body.error : `ocr_failed_${res.status}`,
      res.status,
      retryAfter ? Number(retryAfter) : null,
    );
  }

  return (await res.json()) as OcrResponse;
}

async function safeJson(res: Response): Promise<{ error?: unknown } | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
```

**Step 4: Run test → PASS**

**Step 5: Commit**

```bash
git add src/lib/api/ocrTranslate.ts src/lib/api/ocrTranslate.test.ts
git commit -m "feat(api): ocrTranslate client with injectable fetch"
```

---

## Task 4: ocrTranslate — error paths

**Files:**
- Modify: `src/lib/api/ocrTranslate.test.ts`

**Step 1: Add failing tests**

```typescript
describe('ocrTranslate errors', () => {
  it('throws OcrError with retryAfter on 429', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'rate_limited' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '42' },
        }),
    );
    const file = new File(['x'], 'r.pdf', { type: 'application/pdf' });
    await expect(
      ocrTranslate({ file, targetLang: 'hi', config, fetchImpl }),
    ).rejects.toMatchObject({ status: 429, retryAfterSeconds: 42 });
  });

  it('throws OcrError with parsed message on 4xx', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: 'invalid_target_language' }, { status: 400 }),
    );
    const file = new File(['x'], 'r.pdf', { type: 'application/pdf' });
    await expect(
      ocrTranslate({ file, targetLang: 'hi', config, fetchImpl }),
    ).rejects.toMatchObject({ status: 400, message: 'invalid_target_language' });
  });

  it('throws fallback message on malformed error body', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('not json', { status: 500 }),
    );
    const file = new File(['x'], 'r.pdf', { type: 'application/pdf' });
    await expect(
      ocrTranslate({ file, targetLang: 'hi', config, fetchImpl }),
    ).rejects.toMatchObject({ status: 500, message: 'ocr_failed_500' });
  });
});
```

**Step 2: Run → all PASS** (already implemented in Task 3).

**Step 3: Commit**

```bash
git add src/lib/api/ocrTranslate.test.ts
git commit -m "test(api): cover ocrTranslate 429, 4xx, and malformed-error cases"
```

---

## Task 5: SSE line parser

**Files:**
- Create: `src/lib/api/sse.ts`
- Test: `src/lib/api/sse.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/api/sse.test.ts
import { describe, it, expect } from 'vitest';
import { parseSseStream } from './sse';

function readableFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

describe('parseSseStream', () => {
  it('yields data payloads from well-formed events', async () => {
    const stream = readableFromChunks([
      'data: {"chunk":"hi"}\n\n',
      'data: {"chunk":" there"}\n\n',
      'data: {"done":true}\n\n',
    ]);
    const seen: string[] = [];
    for await (const ev of parseSseStream(stream)) seen.push(JSON.stringify(ev));
    expect(seen).toEqual([
      '{"chunk":"hi"}',
      '{"chunk":" there"}',
      '{"done":true}',
    ]);
  });

  it('handles events split across chunks', async () => {
    const stream = readableFromChunks(['data: {"chu', 'nk":"split"}\n', '\ndata: {"done":true}\n\n']);
    const seen: unknown[] = [];
    for await (const ev of parseSseStream(stream)) seen.push(ev);
    expect(seen).toEqual([{ chunk: 'split' }, { done: true }]);
  });

  it('skips comment and unknown lines', async () => {
    const stream = readableFromChunks([':keep-alive\n\n', 'event: x\ndata: {"chunk":"a"}\n\n']);
    const seen: unknown[] = [];
    for await (const ev of parseSseStream(stream)) seen.push(ev);
    expect(seen).toEqual([{ chunk: 'a' }]);
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implementation**

```typescript
// src/lib/api/sse.ts
export interface SseDataEvent {
  [key: string]: unknown;
}

export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseDataEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIdx: number;
      while ((separatorIdx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, separatorIdx);
        buffer = buffer.slice(separatorIdx + 2);

        for (const line of rawEvent.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            yield JSON.parse(payload) as SseDataEvent;
          } catch {
            // skip malformed payload
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
```

**Step 4: Run → PASS.**

**Step 5: Commit**

```bash
git add src/lib/api/sse.ts src/lib/api/sse.test.ts
git commit -m "feat(api): SSE line parser with chunk-boundary tolerance"
```

---

## Task 6: chat API client

**Files:**
- Create: `src/lib/api/chat.ts`
- Test: `src/lib/api/chat.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/api/chat.test.ts
import { describe, it, expect, vi } from 'vitest';
import { chat } from './chat';

const config = { url: 'https://x.supabase.co', anonKey: 'anon' };

function sseResponse(events: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const e of events) c.enqueue(encoder.encode(e));
      c.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('chat (summary mode)', () => {
  it('emits chunk and done events from SSE', async () => {
    const fetchImpl = vi.fn(async () =>
      sseResponse([
        'data: {"chunk":"Hello "}\n\n',
        'data: {"chunk":"world"}\n\n',
        'data: {"done":true}\n\n',
      ]),
    );

    const events = [];
    for await (const ev of chat({
      mode: 'summary',
      reportText: 'r',
      language: 'hi',
      config,
      fetchImpl,
    })) {
      events.push(ev);
    }

    expect(events).toEqual([
      { kind: 'chunk', text: 'Hello ' },
      { kind: 'chunk', text: 'world' },
      { kind: 'done' },
    ]);

    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      mode: 'summary',
      report_text: 'r',
      target_language: 'hi',
    });
    expect(body.history).toEqual([]);
  });

  it('emits footer event before done', async () => {
    const fetchImpl = vi.fn(async () =>
      sseResponse([
        'data: {"chunk":"reply"}\n\n',
        'data: {"footer":"⚠️ Consult your doctor"}\n\n',
        'data: {"done":true}\n\n',
      ]),
    );
    const events = [];
    for await (const ev of chat({
      mode: 'chat',
      reportText: 'r',
      language: 'hi',
      history: [],
      question: 'why?',
      config,
      fetchImpl,
    })) {
      events.push(ev);
    }
    expect(events).toContainEqual({ kind: 'footer', text: '⚠️ Consult your doctor' });
  });

  it('emits error event on non-2xx', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'upstream_failed' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const events = [];
    for await (const ev of chat({
      mode: 'summary',
      reportText: 'r',
      language: 'hi',
      config,
      fetchImpl,
    })) {
      events.push(ev);
    }
    expect(events).toEqual([{ kind: 'error', message: 'upstream_failed' }]);
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implementation**

```typescript
// src/lib/api/chat.ts
import type { ChatMessage, ChatStreamEvent, Language } from '../types';
import type { SupabaseConfig } from '../env';
import { parseSseStream } from './sse';

interface BaseInput {
  reportText: string;
  language: Language;
  config: SupabaseConfig;
  fetchImpl?: typeof fetch;
}

export type ChatInput =
  | (BaseInput & { mode: 'summary' })
  | (BaseInput & { mode: 'chat'; history: ChatMessage[]; question: string });

export async function* chat(input: ChatInput): AsyncGenerator<ChatStreamEvent> {
  const fetchFn = input.fetchImpl ?? fetch;

  const body =
    input.mode === 'summary'
      ? {
          mode: 'summary' as const,
          report_text: input.reportText,
          target_language: input.language,
          history: [],
        }
      : {
          mode: 'chat' as const,
          report_text: input.reportText,
          target_language: input.language,
          history: input.history,
          question: input.question,
        };

  const res = await fetchFn(`${input.config.url}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.config.anonKey}`,
      apikey: input.config.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    let message = `chat_failed_${res.status}`;
    try {
      const errBody = await res.json();
      if (typeof errBody?.error === 'string') message = errBody.error;
    } catch {
      // ignore
    }
    yield { kind: 'error', message };
    return;
  }

  for await (const ev of parseSseStream(res.body)) {
    if (typeof ev.chunk === 'string') yield { kind: 'chunk', text: ev.chunk };
    else if (typeof ev.footer === 'string') yield { kind: 'footer', text: ev.footer };
    else if (ev.done === true) yield { kind: 'done' };
    else if (typeof ev.error === 'string') yield { kind: 'error', message: ev.error };
  }
}
```

**Step 4: Run → PASS.**

**Step 5: Commit**

```bash
git add src/lib/api/chat.ts src/lib/api/chat.test.ts
git commit -m "feat(api): chat client streams SSE as typed events"
```

---

## Task 7: Zustand store

**Files:**
- Create: `src/store/useReportStore.ts`
- Test: `src/store/useReportStore.test.ts`

**Step 1: Write the failing test**

```typescript
// src/store/useReportStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useReportStore } from './useReportStore';

describe('useReportStore', () => {
  beforeEach(() => useReportStore.getState().reset());

  it('defaults to language=hi and empty state', () => {
    const s = useReportStore.getState();
    expect(s.language).toBe('hi');
    expect(s.report).toBeNull();
    expect(s.summary).toBe('');
    expect(s.messages).toEqual([]);
  });

  it('setLanguage updates language', () => {
    useReportStore.getState().setLanguage('ta');
    expect(useReportStore.getState().language).toBe('ta');
  });

  it('setReport stores report and clears summary/messages', () => {
    useReportStore.setState({ summary: 'old', messages: [{ role: 'user', content: 'x' }] });
    useReportStore.getState().setReport({
      originalText: 'r',
      pageCount: 2,
      sourceLang: 'en',
    });
    const s = useReportStore.getState();
    expect(s.report?.originalText).toBe('r');
    expect(s.summary).toBe('');
    expect(s.messages).toEqual([]);
  });

  it('appendSummary concatenates', () => {
    useReportStore.getState().appendSummary('hel');
    useReportStore.getState().appendSummary('lo');
    expect(useReportStore.getState().summary).toBe('hello');
  });

  it('appendUserMessage and appendAssistantChunk build a turn', () => {
    const s = useReportStore.getState();
    s.appendUserMessage('why?');
    s.appendAssistantChunk('be');
    s.appendAssistantChunk('cause');
    expect(useReportStore.getState().messages).toEqual([
      { role: 'user', content: 'why?' },
      { role: 'assistant', content: 'because' },
    ]);
  });

  it('appendAssistantChunk appends to last assistant message if present', () => {
    const s = useReportStore.getState();
    s.appendUserMessage('q1');
    s.appendAssistantChunk('a');
    s.appendUserMessage('q2');
    s.appendAssistantChunk('b');
    s.appendAssistantChunk('c');
    expect(useReportStore.getState().messages).toEqual([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a' },
      { role: 'user', content: 'q2' },
      { role: 'assistant', content: 'bc' },
    ]);
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implementation**

```typescript
// src/store/useReportStore.ts
import { create } from 'zustand';
import type { ChatMessage, Language, Report } from '@/lib/types';

interface ReportState {
  language: Language;
  report: Report | null;
  summary: string;
  summaryStreaming: boolean;
  messages: ChatMessage[];
  chatStreaming: boolean;

  setLanguage: (lang: Language) => void;
  setReport: (report: Report) => void;
  appendSummary: (chunk: string) => void;
  setSummaryStreaming: (streaming: boolean) => void;
  appendUserMessage: (content: string) => void;
  appendAssistantChunk: (chunk: string) => void;
  setChatStreaming: (streaming: boolean) => void;
  reset: () => void;
}

const initial = {
  language: 'hi' as Language,
  report: null,
  summary: '',
  summaryStreaming: false,
  messages: [] as ChatMessage[],
  chatStreaming: false,
};

export const useReportStore = create<ReportState>((set) => ({
  ...initial,
  setLanguage: (language) => set({ language }),
  setReport: (report) => set({ report, summary: '', messages: [] }),
  appendSummary: (chunk) => set((s) => ({ summary: s.summary + chunk })),
  setSummaryStreaming: (summaryStreaming) => set({ summaryStreaming }),
  appendUserMessage: (content) =>
    set((s) => ({ messages: [...s.messages, { role: 'user', content }] })),
  appendAssistantChunk: (chunk) =>
    set((s) => {
      const last = s.messages[s.messages.length - 1];
      if (last && last.role === 'assistant') {
        const updated = [...s.messages];
        updated[updated.length - 1] = { ...last, content: last.content + chunk };
        return { messages: updated };
      }
      return { messages: [...s.messages, { role: 'assistant', content: chunk }] };
    }),
  setChatStreaming: (chatStreaming) => set({ chatStreaming }),
  reset: () => set(initial),
}));
```

**Step 4: Run → PASS.**

**Step 5: Commit**

```bash
git add src/store/useReportStore.ts src/store/useReportStore.test.ts
git commit -m "feat(store): Zustand store for language, report, summary, messages"
```

---

## Task 8: LanguagePicker component

**Files:**
- Create: `src/components/LanguagePicker.tsx`
- Test: `src/components/LanguagePicker.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/LanguagePicker.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguagePicker } from './LanguagePicker';
import { useReportStore } from '@/store/useReportStore';

describe('LanguagePicker', () => {
  beforeEach(() => useReportStore.getState().reset());

  it('renders all six languages', () => {
    render(<LanguagePicker />);
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(6);
  });

  it('updates store on change', async () => {
    render(<LanguagePicker />);
    await userEvent.selectOptions(screen.getByLabelText(/language/i), 'ta');
    expect(useReportStore.getState().language).toBe('ta');
  });
});
```

**Step 2: Add `@testing-library/user-event` if missing**

```bash
pnpm add -D @testing-library/user-event
```

**Step 3: Run test → FAIL.**

**Step 4: Implementation**

```tsx
// src/components/LanguagePicker.tsx
'use client';

import { LANGUAGES } from '@/lib/types';
import { useReportStore } from '@/store/useReportStore';

export function LanguagePicker() {
  const language = useReportStore((s) => s.language);
  const setLanguage = useReportStore((s) => s.setLanguage);

  return (
    <label className="flex items-center gap-3 text-base">
      <span className="font-medium">Language</span>
      <select
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus:border-slate-500 focus:outline-none"
        value={language}
        onChange={(e) => setLanguage(e.target.value as typeof language)}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

**Step 5: Run → PASS. Commit.**

```bash
git add src/components/LanguagePicker.tsx src/components/LanguagePicker.test.tsx package.json pnpm-lock.yaml
git commit -m "feat(ui): LanguagePicker bound to store"
```

---

## Task 9: UploadZone component

**Files:**
- Create: `src/components/UploadZone.tsx`
- Test: `src/components/UploadZone.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/UploadZone.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadZone } from './UploadZone';

describe('UploadZone', () => {
  it('calls onFile with a valid PDF', async () => {
    const onFile = vi.fn();
    render(<UploadZone onFile={onFile} disabled={false} />);
    const file = new File(['x'], 'r.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText(/upload report/i), file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('rejects files over 10MB and shows an error', async () => {
    const onFile = vi.fn();
    render(<UploadZone onFile={onFile} disabled={false} />);
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    });
    await userEvent.upload(screen.getByLabelText(/upload report/i), big);
    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/too large/i);
  });

  it('rejects unsupported file types', async () => {
    const onFile = vi.fn();
    render(<UploadZone onFile={onFile} disabled={false} />);
    const f = new File(['x'], 'r.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText(/upload report/i), f);
    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/pdf or image/i);
  });

  it('disables input when disabled prop is true', () => {
    render(<UploadZone onFile={() => {}} disabled />);
    expect(screen.getByLabelText(/upload report/i)).toBeDisabled();
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implementation**

```tsx
// src/components/UploadZone.tsx
'use client';

import { useState } from 'react';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png'];

export interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled: boolean;
}

export function UploadZone({ onFile, disabled }: UploadZoneProps) {
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError('Please upload a PDF or image (JPEG/PNG).');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File is too large. Maximum size is 10 MB.');
      e.target.value = '';
      return;
    }
    onFile(file);
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <label
        htmlFor="upload-input"
        className="block cursor-pointer text-lg font-medium text-slate-700"
      >
        Upload report
      </label>
      <p className="mt-2 text-sm text-slate-500">PDF or image, up to 10 MB</p>
      <input
        id="upload-input"
        type="file"
        accept=".pdf,image/jpeg,image/png"
        className="mt-4"
        onChange={handleChange}
        disabled={disabled}
        aria-label="Upload report"
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
```

**Step 4: Run → PASS. Commit.**

```bash
git add src/components/UploadZone.tsx src/components/UploadZone.test.tsx
git commit -m "feat(ui): UploadZone with size and type validation"
```

---

## Task 10: ReportSummary component

**Files:**
- Create: `src/components/ReportSummary.tsx`
- Test: `src/components/ReportSummary.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/ReportSummary.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportSummary } from './ReportSummary';

describe('ReportSummary', () => {
  it('renders summary text and metadata', () => {
    render(
      <ReportSummary
        summary="Plain language summary."
        pageCount={3}
        sourceLang="en"
        streaming={false}
      />,
    );
    expect(screen.getByText(/plain language summary/i)).toBeInTheDocument();
    expect(screen.getByText(/3 page/i)).toBeInTheDocument();
    expect(screen.getByText(/source: english/i)).toBeInTheDocument();
  });

  it('renders a streaming indicator while streaming', () => {
    render(
      <ReportSummary summary="partial" pageCount={null} sourceLang="en" streaming />,
    );
    expect(screen.getByLabelText(/generating summary/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implementation**

```tsx
// src/components/ReportSummary.tsx
import type { Language } from '@/lib/types';

const LANG_NAME: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
};

export interface ReportSummaryProps {
  summary: string;
  pageCount: number | null;
  sourceLang: Language;
  streaming: boolean;
}

export function ReportSummary({ summary, pageCount, sourceLang, streaming }: ReportSummaryProps) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <header className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>Source: {LANG_NAME[sourceLang]}</span>
        {pageCount != null && <span>{pageCount} page{pageCount === 1 ? '' : 's'}</span>}
      </header>
      <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-800">
        {summary}
        {streaming && (
          <span
            aria-label="Generating summary"
            className="ml-1 inline-block h-4 w-2 animate-pulse bg-slate-400 align-middle"
          />
        )}
      </div>
    </section>
  );
}
```

**Step 4: Run → PASS. Commit.**

```bash
git add src/components/ReportSummary.tsx src/components/ReportSummary.test.tsx
git commit -m "feat(ui): ReportSummary with streaming indicator"
```

---

## Task 11: ChatMessage + ChatPanel

**Files:**
- Create: `src/components/ChatMessage.tsx`
- Create: `src/components/ChatPanel.tsx`
- Test: `src/components/ChatPanel.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/ChatPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from './ChatPanel';

describe('ChatPanel', () => {
  it('submits the question and clears the input', async () => {
    const onSend = vi.fn();
    render(<ChatPanel messages={[]} onSend={onSend} streaming={false} />);
    const input = screen.getByLabelText(/your question/i);
    await userEvent.type(input, 'why is hba1c high?');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).toHaveBeenCalledWith('why is hba1c high?');
    expect(input).toHaveValue('');
  });

  it('disables input and button while streaming', () => {
    render(<ChatPanel messages={[]} onSend={() => {}} streaming />);
    expect(screen.getByLabelText(/your question/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('renders user and assistant messages', () => {
    render(
      <ChatPanel
        messages={[
          { role: 'user', content: 'q' },
          { role: 'assistant', content: 'a' },
        ]}
        onSend={() => {}}
        streaming={false}
      />,
    );
    expect(screen.getByText('q')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
  });

  it('does not submit empty messages', async () => {
    const onSend = vi.fn();
    render(<ChatPanel messages={[]} onSend={onSend} streaming={false} />);
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implementation**

```tsx
// src/components/ChatMessage.tsx
import type { ChatMessage as ChatMessageType } from '@/lib/types';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2 text-base leading-relaxed ${
          isUser ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
```

```tsx
// src/components/ChatPanel.tsx
'use client';

import { useState, type FormEvent } from 'react';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { ChatMessage } from './ChatMessage';

export interface ChatPanelProps {
  messages: ChatMessageType[];
  onSend: (question: string) => void;
  streaming: boolean;
}

export function ChatPanel({ messages, onSend, streaming }: ChatPanelProps) {
  const [draft, setDraft] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || streaming) return;
    onSend(trimmed);
    setDraft('');
  }

  return (
    <section className="flex h-full flex-col rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-medium text-slate-800">Ask a question</h2>
      <div className="mb-4 flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Ask anything about your report. The assistant uses only the report contents.
          </p>
        )}
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          aria-label="Your question"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-base focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={streaming}
          placeholder="Type your question…"
        />
        <button
          type="submit"
          disabled={streaming || draft.trim() === ''}
          className="rounded-md bg-slate-800 px-4 py-2 text-base font-medium text-white disabled:bg-slate-400"
        >
          Send
        </button>
      </form>
    </section>
  );
}
```

**Step 4: Run → PASS. Commit.**

```bash
git add src/components/ChatMessage.tsx src/components/ChatPanel.tsx src/components/ChatPanel.test.tsx
git commit -m "feat(ui): ChatPanel with streaming-aware send button"
```

---

## Task 12: Page composition

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx` (add base font, lang attr, title)

**Step 1: Update layout for base font and metadata**

Read the current `src/app/layout.tsx` and replace with:

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Medical Report Companion',
  description:
    'Upload a medical report and get a plain-language summary in your language.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-[18px] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Replace `src/app/page.tsx`**

```tsx
// src/app/page.tsx
'use client';

import { useState } from 'react';
import { LanguagePicker } from '@/components/LanguagePicker';
import { UploadZone } from '@/components/UploadZone';
import { ReportSummary } from '@/components/ReportSummary';
import { ChatPanel } from '@/components/ChatPanel';
import { useReportStore } from '@/store/useReportStore';
import { ocrTranslate, OcrError } from '@/lib/api/ocrTranslate';
import { chat } from '@/lib/api/chat';
import { getSupabaseConfig } from '@/lib/env';
import type { Language } from '@/lib/types';

const config = getSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export default function Page() {
  const language = useReportStore((s) => s.language);
  const report = useReportStore((s) => s.report);
  const summary = useReportStore((s) => s.summary);
  const summaryStreaming = useReportStore((s) => s.summaryStreaming);
  const messages = useReportStore((s) => s.messages);
  const chatStreaming = useReportStore((s) => s.chatStreaming);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const result = await ocrTranslate({ file, targetLang: language, config });
      useReportStore.getState().setReport({
        originalText: result.original_text,
        pageCount: result.page_count,
        sourceLang: result.source_language as Language,
      });
      await streamSummary(result.original_text, language);
    } catch (e) {
      if (e instanceof OcrError && e.status === 429 && e.retryAfterSeconds) {
        setUploadError(`Too many requests. Try again in ${e.retryAfterSeconds}s.`);
      } else {
        setUploadError(e instanceof Error ? e.message : 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  }

  async function streamSummary(reportText: string, lang: Language) {
    const store = useReportStore.getState();
    store.setSummaryStreaming(true);
    try {
      for await (const ev of chat({ mode: 'summary', reportText, language: lang, config })) {
        if (ev.kind === 'chunk') store.appendSummary(ev.text);
        else if (ev.kind === 'footer') store.appendSummary(`\n\n${ev.text}`);
        else if (ev.kind === 'error') store.appendSummary(`\n\n(error: ${ev.message})`);
      }
    } finally {
      useReportStore.getState().setSummaryStreaming(false);
    }
  }

  async function handleSendChat(question: string) {
    if (!report) return;
    const store = useReportStore.getState();
    const history = store.messages;
    store.appendUserMessage(question);
    store.setChatStreaming(true);
    try {
      for await (const ev of chat({
        mode: 'chat',
        reportText: report.originalText,
        language,
        history,
        question,
        config,
      })) {
        if (ev.kind === 'chunk') store.appendAssistantChunk(ev.text);
        else if (ev.kind === 'footer') store.appendAssistantChunk(`\n\n${ev.text}`);
        else if (ev.kind === 'error') store.appendAssistantChunk(`\n\n(error: ${ev.message})`);
      }
    } finally {
      useReportStore.getState().setChatStreaming(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Medical Report Companion</h1>
        <LanguagePicker />
      </header>

      {!report && (
        <UploadZone onFile={handleFile} disabled={uploading} />
      )}

      {uploading && <p className="text-sm text-slate-600">Reading your report…</p>}
      {uploadError && (
        <div role="alert" className="rounded-md bg-red-50 p-4 text-red-800">
          {uploadError}
        </div>
      )}

      {report && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ReportSummary
            summary={summary}
            pageCount={report.pageCount}
            sourceLang={report.sourceLang}
            streaming={summaryStreaming}
          />
          <ChatPanel
            messages={messages}
            onSend={handleSendChat}
            streaming={chatStreaming || summaryStreaming}
          />
        </div>
      )}
    </main>
  );
}
```

**Step 3: Verify build passes**

```bash
pnpm test && pnpm build
```

Expected: all tests green, build succeeds.

**Step 4: Smoke-test in dev**

```bash
pnpm dev
```

Open `http://localhost:3000`, upload `tests/fixtures/digital-en.pdf`, watch the Hindi summary stream in, then ask "what is haemoglobin?". Confirm:
- summary appears word-by-word
- chat input is disabled while summary is streaming
- chat reply also streams
- refresh = blank slate

**Step 5: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx
git commit -m "feat(ui): compose page — upload, streaming summary, chat"
```

---

## Task 13: Final verification before PR

**Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass. If any test references a missing module or fails, fix it before opening the PR.

**Step 2: Lint**

```bash
pnpm lint
```

Expected: no errors. Fix any warnings introduced by the new files.

**Step 3: Build**

```bash
pnpm build
```

Expected: build succeeds without warnings related to the new code.

**Step 4: Push branch**

```bash
git push -u origin feat/upload-summary-chat-ui
```

**Step 5: Open PR**

```bash
gh pr create --base master --title "feat(ui): upload + streaming summary + chat — first end-to-end UI" --body "$(cat <<'EOF'
## Summary
- First user-facing UI for the project. Single page that exercises both deployed Edge Functions end-to-end.
- Upload a PDF or image (≤10 MB), `/ocr-translate` extracts text, `/chat` (mode=summary) streams a plain-language explanation in the chosen language, then `/chat` (mode=chat) handles follow-up questions.
- No auth, no persistence — those follow in subsequent PRs.

## Design doc
See `docs/plans/2026-05-02-upload-summary-chat-ui-design.md`.

## What changed
- `src/lib/types.ts` — shared types (`Language`, `Report`, `ChatMessage`, `OcrResponse`, `ChatStreamEvent`).
- `src/lib/env.ts` — typed Supabase config loader with explicit errors.
- `src/lib/api/ocrTranslate.ts` — multipart POST client with injectable `fetchImpl`. Surfaces 429 `Retry-After`.
- `src/lib/api/sse.ts` — `ReadableStream` → async generator of SSE data events, tolerant of chunk-boundary splits.
- `src/lib/api/chat.ts` — typed event stream over `parseSseStream`.
- `src/store/useReportStore.ts` — Zustand store: language, report, summary (streaming), messages.
- `src/components/{LanguagePicker,UploadZone,ReportSummary,ChatPanel,ChatMessage}.tsx`.
- `src/app/page.tsx` + `src/app/layout.tsx` composed end-to-end.

## Test plan
- [ ] `pnpm install` (picks up `@testing-library/user-event`)
- [ ] `pnpm test` — all unit + component tests pass
- [ ] `pnpm dev` and open http://localhost:3000
- [ ] Upload `tests/fixtures/digital-en.pdf` with language = Hindi → summary streams word-by-word
- [ ] Ask "what is haemoglobin?" in chat → reply streams; chat input disabled during stream
- [ ] Refresh page → blank slate (state is in-memory only)
- [ ] Try a 12 MB file → inline "too large" error, no request
- [ ] Try a `.txt` file → inline "PDF or image" error
- [ ] Disconnect network mid-summary → assistant message ends with `(error: …)`

## Out of scope (next PRs)
- Phase 3.4 — Google OAuth + JWT enforcement on Edge Functions
- Phase 4 proper — persist reports + messages with RLS
- Phases 5–9 — Maps, voice, settings, consent, large-text toggle

EOF
)"
```

---

## Done Definition

- All 13 tasks committed.
- `pnpm test` passes (≥80% coverage on `src/lib/api/`, `src/store/`, `src/components/`).
- `pnpm build` succeeds.
- PR open against `master` with the description above.
- Manual smoke test on `http://localhost:3000` confirms upload → streaming summary → chat.
