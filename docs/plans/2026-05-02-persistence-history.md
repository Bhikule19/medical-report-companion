# Persistence + History Sidebar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist reports + chat messages directly from the browser via RLS-scoped Supabase client; render a history sidebar that lets users reload past reports.

**Architecture:** Repository modules (`src/lib/db/{reports,messages}.ts`) wrap the `@supabase/supabase-js` browser client. Writes happen on upload (report row), summary completion (first assistant message), and each chat turn (user + assistant). Page mount loads the user's reports into a sidebar; clicking an item fetches the full report + messages and rehydrates the in-memory store. RLS policies scoped to `auth.uid()` are the source of truth — frontend `eq('user_id', uid)` is defence-in-depth.

**Tech Stack:** Next.js 15.5.15 · React 19 · TypeScript · `@supabase/supabase-js` 2.104+ · Zustand 5 · Vitest 4 · @testing-library/react.

**Reference:** Design doc `docs/plans/2026-05-02-persistence-history-design.md`. Schema in `supabase/migrations/20260428161913_init.sql` + RLS in `20260428161914_rls.sql`.

---

## Task 1: Reports repository

**Files:**
- Create: `src/lib/db/reports.ts`
- Create: `src/lib/db/reports.test.ts`

**Step 1: Failing test**

```typescript
// src/lib/db/reports.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createReport, listReports, getReport } from './reports';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (r: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

function fakeClient(chain: ReturnType<typeof makeChain>): SupabaseClient {
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

describe('createReport', () => {
  it('inserts the report row and returns the new id', async () => {
    const chain = makeChain({
      data: { id: 'r-1', created_at: '2026-05-02T00:00:00Z' },
      error: null,
    });
    const client = fakeClient(chain);

    const result = await createReport(client, {
      userId: 'u-1',
      title: 'CBC report',
      extractedText: 'lorem',
      translatedText: 'lorem-hi',
      sourceLang: 'en',
      targetLang: 'hi',
      pageCount: 2,
    });

    expect(client.from).toHaveBeenCalledWith('reports');
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: 'u-1',
      title: 'CBC report',
      extracted_text: 'lorem',
      translated_text: 'lorem-hi',
      source_lang: 'en',
      target_lang: 'hi',
      page_count: 2,
    });
    expect(result.id).toBe('r-1');
  });

  it('throws when supabase returns an error', async () => {
    const chain = makeChain({ data: null, error: { message: 'rls_denied' } });
    const client = fakeClient(chain);
    await expect(
      createReport(client, {
        userId: 'u-1',
        title: 't',
        extractedText: 'x',
        translatedText: null,
        sourceLang: 'en',
        targetLang: 'hi',
        pageCount: null,
      }),
    ).rejects.toThrow(/rls_denied/);
  });
});

describe('listReports', () => {
  it('returns rows ordered desc by created_at', async () => {
    const chain = makeChain({
      data: [
        { id: 'r-2', title: 'B', created_at: '2026-05-02', target_lang: 'hi' },
        { id: 'r-1', title: 'A', created_at: '2026-05-01', target_lang: 'en' },
      ],
      error: null,
    });
    const client = fakeClient(chain);
    const rows = await listReports(client, 'u-1');
    expect(client.from).toHaveBeenCalledWith('reports');
    expect(chain.select).toHaveBeenCalledWith('id, title, created_at, target_lang');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(rows).toHaveLength(2);
  });
});

describe('getReport', () => {
  it('returns the full row by id', async () => {
    const chain = makeChain({
      data: {
        id: 'r-1',
        user_id: 'u-1',
        title: 'A',
        extracted_text: 'lorem',
        translated_text: 'lorem-hi',
        source_lang: 'en',
        target_lang: 'hi',
        page_count: 2,
        created_at: '2026-05-01',
      },
      error: null,
    });
    const client = fakeClient(chain);
    const row = await getReport(client, 'r-1');
    expect(client.from).toHaveBeenCalledWith('reports');
    expect(chain.eq).toHaveBeenCalledWith('id', 'r-1');
    expect(row.title).toBe('A');
  });
});
```

**Step 2: Run** → FAIL (`pnpm test -- src/lib/db/reports.test.ts`).

**Step 3: Implementation**

```typescript
// src/lib/db/reports.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Language } from '@/lib/types';

export interface CreateReportInput {
  userId: string;
  title: string;
  extractedText: string;
  translatedText: string | null;
  sourceLang: Language | null;
  targetLang: Language;
  pageCount: number | null;
}

export interface ReportRow {
  id: string;
  user_id: string;
  title: string | null;
  extracted_text: string;
  translated_text: string | null;
  source_lang: Language | null;
  target_lang: Language;
  page_count: number | null;
  created_at: string;
}

export interface ReportSummaryRow {
  id: string;
  title: string | null;
  created_at: string;
  target_lang: Language;
}

export async function createReport(
  client: SupabaseClient,
  input: CreateReportInput,
): Promise<{ id: string; created_at: string }> {
  const { data, error } = await client
    .from('reports')
    .insert({
      user_id: input.userId,
      title: input.title,
      extracted_text: input.extractedText,
      translated_text: input.translatedText,
      source_lang: input.sourceLang,
      target_lang: input.targetLang,
      page_count: input.pageCount,
    })
    .select('id, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data as { id: string; created_at: string };
}

export async function listReports(
  client: SupabaseClient,
  userId: string,
): Promise<ReportSummaryRow[]> {
  const { data, error } = await client
    .from('reports')
    .select('id, title, created_at, target_lang')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ReportSummaryRow[];
}

export async function getReport(
  client: SupabaseClient,
  reportId: string,
): Promise<ReportRow> {
  const { data, error } = await client
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) throw new Error(error.message);
  return data as ReportRow;
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/lib/db/reports.ts src/lib/db/reports.test.ts
git commit -m "feat(db): reports repository (create, list, get)"
```

---

## Task 2: Messages repository

**Files:**
- Create: `src/lib/db/messages.ts`
- Create: `src/lib/db/messages.test.ts`

**Step 1: Failing test**

```typescript
// src/lib/db/messages.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createMessage, listMessagesForReport } from './messages';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (r: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

function fakeClient(chain: ReturnType<typeof makeChain>): SupabaseClient {
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

describe('createMessage', () => {
  it('inserts a row with the right shape and returns the new id', async () => {
    const chain = makeChain({ data: { id: 'm-1' }, error: null });
    const client = fakeClient(chain);
    const result = await createMessage(client, {
      reportId: 'r-1',
      userId: 'u-1',
      role: 'assistant',
      content: 'hello',
    });
    expect(client.from).toHaveBeenCalledWith('messages');
    expect(chain.insert).toHaveBeenCalledWith({
      report_id: 'r-1',
      user_id: 'u-1',
      role: 'assistant',
      content: 'hello',
      voice_input: false,
    });
    expect(result.id).toBe('m-1');
  });

  it('throws on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'rls_denied' } });
    const client = fakeClient(chain);
    await expect(
      createMessage(client, {
        reportId: 'r-1',
        userId: 'u-1',
        role: 'user',
        content: 'q',
      }),
    ).rejects.toThrow(/rls_denied/);
  });
});

describe('listMessagesForReport', () => {
  it('returns messages ordered asc by created_at', async () => {
    const chain = makeChain({
      data: [
        { id: 'm-1', role: 'assistant', content: 'summary', created_at: '1' },
        { id: 'm-2', role: 'user', content: 'q', created_at: '2' },
      ],
      error: null,
    });
    const client = fakeClient(chain);
    const rows = await listMessagesForReport(client, 'r-1');
    expect(chain.select).toHaveBeenCalledWith('id, role, content, created_at');
    expect(chain.eq).toHaveBeenCalledWith('report_id', 'r-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(rows).toHaveLength(2);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```typescript
// src/lib/db/messages.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateMessageInput {
  reportId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface MessageRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export async function createMessage(
  client: SupabaseClient,
  input: CreateMessageInput,
): Promise<{ id: string }> {
  const { data, error } = await client
    .from('messages')
    .insert({
      report_id: input.reportId,
      user_id: input.userId,
      role: input.role,
      content: input.content,
      voice_input: false,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function listMessagesForReport(
  client: SupabaseClient,
  reportId: string,
): Promise<MessageRow[]> {
  const { data, error } = await client
    .from('messages')
    .select('id, role, content, created_at')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MessageRow[];
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/lib/db/messages.ts src/lib/db/messages.test.ts
git commit -m "feat(db): messages repository (create, list by report)"
```

---

## Task 3: Extend useReportStore

**Files:**
- Modify: `src/store/useReportStore.ts`
- Modify: `src/store/useReportStore.test.ts`

**Step 1: Add failing tests**

```typescript
// append to src/store/useReportStore.test.ts
describe('useReportStore — history additions', () => {
  beforeEach(() => useReportStore.getState().reset());

  it('setHistoryList replaces the historyList', () => {
    useReportStore.getState().setHistoryList([
      { id: 'r-1', title: 'A', created_at: '1', target_lang: 'hi' },
    ]);
    expect(useReportStore.getState().historyList).toHaveLength(1);
  });

  it('loadReport hydrates report, summary, and messages', () => {
    useReportStore.getState().loadReport(
      {
        id: 'r-1',
        originalText: 'orig',
        pageCount: 2,
        sourceLang: 'en',
      },
      [
        { role: 'assistant', content: 'summary text' },
        { role: 'user', content: 'q' },
        { role: 'assistant', content: 'a' },
      ],
    );
    const s = useReportStore.getState();
    expect(s.report?.id).toBe('r-1');
    expect(s.summary).toBe('summary text');
    expect(s.messages).toEqual([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'a' },
    ]);
  });

  it('loadReport with empty messages leaves summary as empty string', () => {
    useReportStore.getState().loadReport(
      { id: 'r-1', originalText: 'o', pageCount: null, sourceLang: 'en' },
      [],
    );
    expect(useReportStore.getState().summary).toBe('');
    expect(useReportStore.getState().messages).toEqual([]);
  });

  it('clearReport removes report, summary, messages but keeps historyList', () => {
    useReportStore.setState({
      report: { id: 'r-1', originalText: 'o', pageCount: null, sourceLang: 'en' },
      summary: 's',
      messages: [{ role: 'user', content: 'q' }],
      historyList: [{ id: 'r-1', title: 'A', created_at: '1', target_lang: 'hi' }],
    });
    useReportStore.getState().clearReport();
    const s = useReportStore.getState();
    expect(s.report).toBeNull();
    expect(s.summary).toBe('');
    expect(s.messages).toEqual([]);
    expect(s.historyList).toHaveLength(1);
  });
});
```

**Step 2: Update `Report` type and store**

```typescript
// modify src/lib/types.ts — add `id` to Report
export interface Report {
  id: string | null; // null until persisted
  originalText: string;
  pageCount: number | null;
  sourceLang: Language;
}
```

```typescript
// modify src/store/useReportStore.ts
import { create } from 'zustand';
import type { ChatMessage, Language, Report } from '@/lib/types';
import type { ReportSummaryRow } from '@/lib/db/reports';

interface ReportState {
  language: Language;
  report: Report | null;
  summary: string;
  summaryStreaming: boolean;
  messages: ChatMessage[];
  chatStreaming: boolean;
  historyList: ReportSummaryRow[];

  setLanguage: (lang: Language) => void;
  setReport: (report: Report) => void;
  appendSummary: (chunk: string) => void;
  setSummaryStreaming: (streaming: boolean) => void;
  appendUserMessage: (content: string) => void;
  appendAssistantChunk: (chunk: string) => void;
  setChatStreaming: (streaming: boolean) => void;
  setHistoryList: (list: ReportSummaryRow[]) => void;
  loadReport: (
    report: Report,
    messages: { role: 'user' | 'assistant'; content: string }[],
  ) => void;
  clearReport: () => void;
  reset: () => void;
}

const initial = {
  language: 'hi' as Language,
  report: null,
  summary: '',
  summaryStreaming: false,
  messages: [] as ChatMessage[],
  chatStreaming: false,
  historyList: [] as ReportSummaryRow[],
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
  setHistoryList: (historyList) => set({ historyList }),
  loadReport: (report, messages) => {
    const [first, ...rest] = messages;
    const summary = first?.role === 'assistant' ? first.content : '';
    const remaining = first?.role === 'assistant' ? rest : messages;
    set({ report, summary, messages: remaining });
  },
  clearReport: () => set({ report: null, summary: '', messages: [] }),
  reset: () => set(initial),
}));
```

**Step 3: Update existing tests** that construct a `Report` literal — add `id: null` (or any string) to keep type-checking green. Also update `src/app/page.tsx` later (Task 5).

```bash
# search and update existing literals
grep -rln "originalText: 'r'" src/store/useReportStore.test.ts
```

In `useReportStore.test.ts`, find the existing test that calls `setReport({ originalText: 'r', pageCount: 2, sourceLang: 'en' })` and add `id: 'r-1'`. Same for any other literal.

**Step 4: Run tests** → PASS.

**Step 5: Commit**

```bash
git add src/store/useReportStore.ts src/store/useReportStore.test.ts src/lib/types.ts
git commit -m "feat(store): historyList, loadReport, clearReport actions; Report.id field"
```

---

## Task 4: HistorySidebar component

**Files:**
- Create: `src/components/HistoryItem.tsx`
- Create: `src/components/HistorySidebar.tsx`
- Create: `src/components/HistorySidebar.test.tsx`

**Step 1: Failing test**

```typescript
// src/components/HistorySidebar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistorySidebar } from './HistorySidebar';

describe('HistorySidebar', () => {
  it('renders empty state when no items', () => {
    render(
      <HistorySidebar
        items={[]}
        activeId={null}
        onSelect={() => {}}
        onNew={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByText(/no past reports/i)).toBeInTheDocument();
  });

  it('renders one item per row', () => {
    render(
      <HistorySidebar
        items={[
          { id: 'r-1', title: 'CBC', created_at: '2026-05-01T00:00:00Z', target_lang: 'hi' },
          { id: 'r-2', title: null, created_at: '2026-05-02T00:00:00Z', target_lang: 'en' },
        ]}
        activeId={null}
        onSelect={() => {}}
        onNew={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByText('CBC')).toBeInTheDocument();
    expect(screen.getByText(/report from/i)).toBeInTheDocument();
  });

  it('calls onSelect with id on click', async () => {
    const onSelect = vi.fn();
    render(
      <HistorySidebar
        items={[{ id: 'r-1', title: 'CBC', created_at: '2026-05-01T00:00:00Z', target_lang: 'hi' }]}
        activeId={null}
        onSelect={onSelect}
        onNew={() => {}}
        disabled={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /CBC/ }));
    expect(onSelect).toHaveBeenCalledWith('r-1');
  });

  it('calls onNew when "New report" clicked', async () => {
    const onNew = vi.fn();
    render(
      <HistorySidebar items={[]} activeId={null} onSelect={() => {}} onNew={onNew} disabled={false} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /new report/i }));
    expect(onNew).toHaveBeenCalled();
  });

  it('disables all buttons when disabled=true', () => {
    render(
      <HistorySidebar
        items={[{ id: 'r-1', title: 'CBC', created_at: '2026-05-01T00:00:00Z', target_lang: 'hi' }]}
        activeId={null}
        onSelect={() => {}}
        onNew={() => {}}
        disabled
      />,
    );
    expect(screen.getByRole('button', { name: /new report/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /CBC/ })).toBeDisabled();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/HistoryItem.tsx
import type { ReportSummaryRow } from '@/lib/db/reports';

export interface HistoryItemProps {
  item: ReportSummaryRow;
  active: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}

export function HistoryItem({ item, active, disabled, onSelect }: HistoryItemProps) {
  const date = new Date(item.created_at);
  const label = item.title || `Report from ${date.toLocaleDateString()}`;
  const time = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      disabled={disabled}
      className={`flex w-full flex-col items-start rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
        active
          ? 'border-slate-700 bg-slate-100'
          : 'border-slate-200 bg-white hover:border-slate-400'
      }`}
    >
      <span className="font-medium text-slate-800">{label}</span>
      <span className="text-xs text-slate-500">{time}</span>
    </button>
  );
}
```

```tsx
// src/components/HistorySidebar.tsx
'use client';

import type { ReportSummaryRow } from '@/lib/db/reports';
import { HistoryItem } from './HistoryItem';

export interface HistorySidebarProps {
  items: ReportSummaryRow[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  disabled: boolean;
}

export function HistorySidebar({
  items,
  activeId,
  onSelect,
  onNew,
  disabled,
}: HistorySidebarProps) {
  return (
    <aside className="flex h-full w-full max-w-xs flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={onNew}
        disabled={disabled}
        className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
      >
        New report
      </button>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Past reports
      </h2>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {items.length === 0 && (
          <p className="text-sm text-slate-500">No past reports yet.</p>
        )}
        {items.map((item) => (
          <HistoryItem
            key={item.id}
            item={item}
            active={item.id === activeId}
            disabled={disabled}
            onSelect={onSelect}
          />
        ))}
      </div>
    </aside>
  );
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/HistoryItem.tsx src/components/HistorySidebar.tsx src/components/HistorySidebar.test.tsx
git commit -m "feat(ui): HistorySidebar with empty state and active highlight"
```

---

## Task 5: Wire persistence + sidebar into the home page

**Files:**
- Modify: `src/app/page.tsx`

This is a larger composition change. Read the file first, then replace the `HomeContent` component body.

**Step 1: Read current page.tsx** to confirm shape.

**Step 2: Replace `src/app/page.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LanguagePicker } from '@/components/LanguagePicker';
import { UploadZone } from '@/components/UploadZone';
import { ReportSummary } from '@/components/ReportSummary';
import { ChatPanel } from '@/components/ChatPanel';
import { AuthGate } from '@/components/AuthGate';
import { UserMenu } from '@/components/UserMenu';
import { HistorySidebar } from '@/components/HistorySidebar';
import { useReportStore } from '@/store/useReportStore';
import { ocrTranslate, OcrError } from '@/lib/api/ocrTranslate';
import { chat } from '@/lib/api/chat';
import { getSupabaseConfig } from '@/lib/env';
import { useSession } from '@/lib/auth/useSession';
import { getBrowserSupabase } from '@/lib/supabase/browserClient';
import {
  createReport,
  getReport,
  listReports,
  type ReportSummaryRow,
} from '@/lib/db/reports';
import { createMessage, listMessagesForReport } from '@/lib/db/messages';
import type { Language } from '@/lib/types';

const config = getSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

function deriveTitle(file: File): string {
  const stem = file.name.replace(/\.[^.]+$/, '').trim();
  return stem || `Report from ${new Date().toLocaleDateString()}`;
}

function HomeContent() {
  const router = useRouter();
  const { session } = useSession();
  const supabase = getBrowserSupabase();

  const language = useReportStore((s) => s.language);
  const report = useReportStore((s) => s.report);
  const summary = useReportStore((s) => s.summary);
  const summaryStreaming = useReportStore((s) => s.summaryStreaming);
  const messages = useReportStore((s) => s.messages);
  const chatStreaming = useReportStore((s) => s.chatStreaming);
  const historyList = useReportStore((s) => s.historyList);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const refreshHistory = useCallback(
    async (userId: string) => {
      try {
        const rows = await listReports(supabase, userId);
        useReportStore.getState().setHistoryList(rows);
        setHistoryError(null);
      } catch (e) {
        setHistoryError((e as Error).message);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (session?.user?.id) refreshHistory(session.user.id);
  }, [session?.user?.id, refreshHistory]);

  function bounceToSignIn() {
    router.replace('/sign-in?error=session_expired');
  }

  async function handleFile(file: File) {
    if (!session) return bounceToSignIn();
    setUploadError(null);
    setUploading(true);
    try {
      const result = await ocrTranslate({
        file,
        targetLang: language,
        accessToken: session.access_token,
        config,
      });

      let reportId: string;
      try {
        const inserted = await createReport(supabase, {
          userId: session.user.id,
          title: deriveTitle(file),
          extractedText: result.original_text,
          translatedText: result.translated_text ?? null,
          sourceLang: (result.source_language as Language) ?? null,
          targetLang: language,
          pageCount: result.page_count,
        });
        reportId = inserted.id;
      } catch (e) {
        setUploadError(`Couldn't save your report. ${(e as Error).message}`);
        return;
      }

      useReportStore.getState().setReport({
        id: reportId,
        originalText: result.original_text,
        pageCount: result.page_count,
        sourceLang: (result.source_language as Language) ?? language,
      });

      await streamSummary(reportId, result.original_text, language, session.access_token, session.user.id);
      await refreshHistory(session.user.id);
    } catch (e) {
      if (e instanceof OcrError && e.status === 401) return bounceToSignIn();
      if (e instanceof OcrError && e.status === 429 && e.retryAfterSeconds) {
        setUploadError(`Too many requests. Try again in ${e.retryAfterSeconds}s.`);
      } else {
        setUploadError(e instanceof Error ? e.message : 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  }

  async function streamSummary(
    reportId: string,
    reportText: string,
    lang: Language,
    accessToken: string,
    userId: string,
  ) {
    const store = useReportStore.getState();
    store.setSummaryStreaming(true);
    try {
      for await (const ev of chat({
        mode: 'summary',
        reportText,
        language: lang,
        accessToken,
        config,
      })) {
        if (ev.kind === 'chunk') store.appendSummary(ev.text);
        else if (ev.kind === 'footer') store.appendSummary(`\n\n${ev.text}`);
        else if (ev.kind === 'error') store.appendSummary(`\n\n(error: ${ev.message})`);
      }
      // Persist the completed summary as the first assistant message.
      const finalSummary = useReportStore.getState().summary;
      if (finalSummary.trim().length > 0) {
        try {
          await createMessage(supabase, {
            reportId,
            userId,
            role: 'assistant',
            content: finalSummary,
          });
        } catch (e) {
          console.error('save_summary_failed', (e as Error).message);
        }
      }
    } finally {
      useReportStore.getState().setSummaryStreaming(false);
    }
  }

  async function handleSendChat(question: string) {
    if (!report?.id || !session) return;
    const reportId = report.id;
    const userId = session.user.id;
    const store = useReportStore.getState();
    const history = store.messages;

    store.appendUserMessage(question);
    try {
      await createMessage(supabase, { reportId, userId, role: 'user', content: question });
    } catch (e) {
      console.error('save_user_message_failed', (e as Error).message);
    }

    store.setChatStreaming(true);
    try {
      for await (const ev of chat({
        mode: 'chat',
        reportText: report.originalText,
        language,
        accessToken: session.access_token,
        history,
        question,
        config,
      })) {
        if (ev.kind === 'chunk') store.appendAssistantChunk(ev.text);
        else if (ev.kind === 'footer') store.appendAssistantChunk(`\n\n${ev.text}`);
        else if (ev.kind === 'error') store.appendAssistantChunk(`\n\n(error: ${ev.message})`);
      }
      const all = useReportStore.getState().messages;
      const last = all[all.length - 1];
      if (last?.role === 'assistant' && last.content.trim().length > 0) {
        try {
          await createMessage(supabase, {
            reportId,
            userId,
            role: 'assistant',
            content: last.content,
          });
        } catch (e) {
          console.error('save_assistant_message_failed', (e as Error).message);
        }
      }
    } finally {
      useReportStore.getState().setChatStreaming(false);
    }
  }

  async function handleSelectHistory(id: string) {
    if (!session) return;
    try {
      const [row, msgs] = await Promise.all([
        getReport(supabase, id),
        listMessagesForReport(supabase, id),
      ]);
      useReportStore.getState().loadReport(
        {
          id: row.id,
          originalText: row.extracted_text,
          pageCount: row.page_count,
          sourceLang: (row.source_lang ?? row.target_lang) as Language,
        },
        msgs.map((m) => ({ role: m.role, content: m.content })),
      );
    } catch (e) {
      console.error('load_report_failed', (e as Error).message);
    }
  }

  const streaming = summaryStreaming || chatStreaming || uploading;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Medical Report Companion</h1>
        <div className="flex flex-wrap items-center gap-4">
          <LanguagePicker />
          {session?.user?.email && <UserMenu email={session.user.email} />}
        </div>
      </header>

      {historyError && (
        <div role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Couldn&apos;t load history: {historyError}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => session?.user?.id && refreshHistory(session.user.id)}
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <HistorySidebar
          items={historyList}
          activeId={report?.id ?? null}
          onSelect={handleSelectHistory}
          onNew={() => useReportStore.getState().clearReport()}
          disabled={streaming}
        />

        <div className="flex flex-col gap-6">
          {!report && <UploadZone onFile={handleFile} disabled={uploading} />}
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
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <HomeContent />
    </AuthGate>
  );
}
```

**Step 3: Verify**

```bash
pnpm test
pnpm lint
pnpm build
```

All green.

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(ui): persist reports + messages, history sidebar reload"
```

---

## Task 6: Final smoke test + PR

**Step 1: Manual smoke**

```bash
pnpm dev
```

Then:
1. Sign in. Upload a report. Wait for summary.
2. Send "what is haemoglobin?" — see the reply stream.
3. Refresh. Sidebar shows the report. Click it. Summary and the user/assistant turn re-appear.
4. Click "New report". Upload a different file. Two items in sidebar; both load correctly.
5. Sign out, sign back in. History still there.
6. Open Supabase Dashboard → Table Editor → `reports` and `messages`. Confirm rows are there with the right `user_id`.

If anything misbehaves, fix and commit before opening the PR.

**Step 2: Push branch**

```bash
git push -u origin feat/persistence-history
```

**Step 3: Open PR**

```bash
gh pr create --base master \
  --title "feat: persist reports and chat; history sidebar to reload past reports (Phase 4 slice)" \
  --body "$(cat <<'EOF'
## Summary
- Persists reports + chat messages to Supabase via the browser client. RLS scopes every write to `auth.uid()`; frontend `eq('user_id', uid)` is defence-in-depth.
- New `HistorySidebar` lists past reports. Click to reload — the first assistant message becomes the summary; subsequent rows become the chat history.
- "New report" clears the in-memory state so the upload zone reappears. (No DB delete in this PR — that's the next one.)
- No new migrations. Phase 3 schema covers everything.

## Design + plan
- `docs/plans/2026-05-02-persistence-history-design.md`
- `docs/plans/2026-05-02-persistence-history.md`

## Test plan
- [ ] `pnpm install && pnpm test` — all green
- [ ] `pnpm build` — succeeds
- [ ] Sign in → upload → summary streams → send a chat → both stream
- [ ] Refresh → sidebar shows the report → click → summary + chat reload exactly
- [ ] "New report" → upload zone returns; old report still in sidebar
- [ ] Upload a second report → sidebar shows both → clicking either loads correctly
- [ ] Sign out + sign back in → history persists
- [ ] Open Supabase Table Editor → confirm `reports` and `messages` rows exist with the right `user_id`
- [ ] (Optional) Tamper localStorage JWT → uploads bounce to `/sign-in?error=session_expired`

## Out of scope
- Per-report delete (next PR).
- Settings page exposing the `consents` table.
- Title generation via LLM.
- Pagination of `listReports`.
EOF
)"
```

---

## Done definition

- All 6 tasks committed.
- `pnpm test` passes (≥21 new tests across db + store + sidebar).
- `pnpm build` succeeds.
- Manual smoke confirms persistence, refresh, and history reload.
- PR open against `master`.
