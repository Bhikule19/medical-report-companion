# Privacy Controls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-report delete with confirm dialog and a `/settings` page that exposes the `consents` table; respect those consents in upload + chat write paths.

**Architecture:** New repo `consents.ts` with lazy defaults (no row → schema defaults). New `deleteReport` in the existing `reports.ts`. Generic `ConfirmDialog` component plus a thin `DeleteReportButton` wrapper. New `/settings` page composed from a `ConsentToggles` component. Page wiring guards `createReport` and `createMessage` calls behind the consent state held in the store.

**Tech Stack:** Next.js 15.5.15 · React 19 · TypeScript · `@supabase/supabase-js` 2.104+ · Zustand 5 · Vitest 4 · @testing-library/react.

**Reference:** Design at `docs/plans/2026-05-02-privacy-controls-design.md`. Existing schema in `supabase/migrations/20260428161913_init.sql` already has `consents` table; RLS already in `20260428161914_rls.sql`.

---

## Task 1: Add `deleteReport` to the reports repository

**Files:**
- Modify: `src/lib/db/reports.ts`
- Modify: `src/lib/db/reports.test.ts`

**Step 1: Failing test**

Append to `src/lib/db/reports.test.ts`:

```typescript
describe('deleteReport', () => {
  it('deletes the row by id and resolves', async () => {
    const chain = makeChain({ data: null, error: null });
    chain.delete = vi.fn(() => chain);
    const client = fakeClient(chain);

    await deleteReport(client, 'r-1');

    expect(client.from).toHaveBeenCalledWith('reports');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'r-1');
  });

  it('throws when supabase returns an error', async () => {
    const chain = makeChain({ data: null, error: { message: 'rls_denied' } });
    chain.delete = vi.fn(() => chain);
    const client = fakeClient(chain);
    await expect(deleteReport(client, 'r-1')).rejects.toThrow(/rls_denied/);
  });
});
```

Update the `makeChain` helper in `reports.test.ts` so the chain resolves on `eq` for delete cases — currently `eq` returns the chain (not a Promise). The delete API resolves directly: `await client.from('reports').delete().eq('id', id)`. So make `eq` thenable too:

```typescript
function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (r: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}
```

The `then` makes the chain itself awaitable, which is how `delete().eq(...)` works in supabase-js.

Add the import: `import { deleteReport } from './reports';` (alongside the existing import line).

**Step 2: Run** → FAIL (function not defined).

```bash
pnpm test -- src/lib/db/reports.test.ts
```

**Step 3: Implementation**

Append to `src/lib/db/reports.ts`:

```typescript
export async function deleteReport(
  client: SupabaseClient,
  reportId: string,
): Promise<void> {
  const { error } = await client.from('reports').delete().eq('id', reportId);
  if (error) throw new Error(error.message);
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/lib/db/reports.ts src/lib/db/reports.test.ts
git commit -m "feat(db): deleteReport — cascades to messages via FK"
```

---

## Task 2: Consents repository

**Files:**
- Create: `src/lib/db/consents.ts`
- Create: `src/lib/db/consents.test.ts`

**Step 1: Failing tests**

```typescript
// src/lib/db/consents.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getConsents, updateConsents, DEFAULT_CONSENTS } from './consents';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (r: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

function fakeClient(chain: ReturnType<typeof makeChain>): SupabaseClient {
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

describe('getConsents', () => {
  it('returns row when present', async () => {
    const chain = makeChain({
      data: {
        user_id: 'u-1',
        store_reports: false,
        store_chat: true,
        store_voice_transcripts: false,
      },
      error: null,
    });
    const client = fakeClient(chain);
    const result = await getConsents(client, 'u-1');
    expect(client.from).toHaveBeenCalledWith('consents');
    expect(chain.select).toHaveBeenCalledWith('store_reports, store_chat, store_voice_transcripts');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(result).toEqual({
      store_reports: false,
      store_chat: true,
      store_voice_transcripts: false,
    });
  });

  it('returns DEFAULT_CONSENTS when no row exists', async () => {
    const chain = makeChain({ data: null, error: null });
    const client = fakeClient(chain);
    const result = await getConsents(client, 'u-1');
    expect(result).toEqual(DEFAULT_CONSENTS);
  });

  it('throws on a real error', async () => {
    const chain = makeChain({ data: null, error: { message: 'rls_denied' } });
    const client = fakeClient(chain);
    await expect(getConsents(client, 'u-1')).rejects.toThrow(/rls_denied/);
  });
});

describe('updateConsents', () => {
  it('upserts the merged payload with user_id PK', async () => {
    const chain = makeChain({ data: null, error: null });
    const client = fakeClient(chain);
    await updateConsents(client, 'u-1', { store_chat: false });
    expect(client.from).toHaveBeenCalledWith('consents');
    expect(chain.upsert).toHaveBeenCalledWith(
      { user_id: 'u-1', store_chat: false },
      { onConflict: 'user_id' },
    );
  });

  it('throws on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'rls_denied' } });
    const client = fakeClient(chain);
    await expect(
      updateConsents(client, 'u-1', { store_reports: false }),
    ).rejects.toThrow(/rls_denied/);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```typescript
// src/lib/db/consents.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ConsentValues {
  store_reports: boolean;
  store_chat: boolean;
  store_voice_transcripts: boolean;
}

export const DEFAULT_CONSENTS: ConsentValues = {
  store_reports: true,
  store_chat: true,
  store_voice_transcripts: true,
};

export async function getConsents(
  client: SupabaseClient,
  userId: string,
): Promise<ConsentValues> {
  const { data, error } = await client
    .from('consents')
    .select('store_reports, store_chat, store_voice_transcripts')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_CONSENTS;
  return data as ConsentValues;
}

export async function updateConsents(
  client: SupabaseClient,
  userId: string,
  partial: Partial<ConsentValues>,
): Promise<void> {
  const { error } = await client
    .from('consents')
    .upsert({ user_id: userId, ...partial }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/lib/db/consents.ts src/lib/db/consents.test.ts
git commit -m "feat(db): consents repository with default-on fallback and upsert"
```

---

## Task 3: Extend store with consents

**Files:**
- Modify: `src/store/useReportStore.ts`
- Modify: `src/store/useReportStore.test.ts`

**Step 1: Failing tests**

Append to `useReportStore.test.ts`:

```typescript
describe('useReportStore — consents additions', () => {
  beforeEach(() => useReportStore.getState().reset());

  it('defaults consents to all-true', () => {
    const s = useReportStore.getState();
    expect(s.consents).toEqual({
      store_reports: true,
      store_chat: true,
      store_voice_transcripts: true,
    });
  });

  it('setConsents replaces consents', () => {
    useReportStore.getState().setConsents({
      store_reports: false,
      store_chat: false,
      store_voice_transcripts: true,
    });
    expect(useReportStore.getState().consents.store_reports).toBe(false);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Update store**

```typescript
// src/store/useReportStore.ts — add consents
import type { ConsentValues } from '@/lib/db/consents';
import { DEFAULT_CONSENTS } from '@/lib/db/consents';

interface ReportState {
  // ...existing fields
  consents: ConsentValues;
  setConsents: (values: ConsentValues) => void;
  // ...
}

const initial = {
  // ...existing
  historyList: [] as ReportSummaryRow[],
  consents: DEFAULT_CONSENTS,
};

// in create<ReportState>(...) add:
//   setConsents: (consents) => set({ consents }),
```

Apply by editing the existing file: add the `consents` field to the interface, the initial state, and the action.

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/store/useReportStore.ts src/store/useReportStore.test.ts
git commit -m "feat(store): consents state with default-on values"
```

---

## Task 4: ConfirmDialog component

**Files:**
- Create: `src/components/ConfirmDialog.tsx`
- Create: `src/components/ConfirmDialog.test.tsx`

**Step 1: Failing tests**

```typescript
// src/components/ConfirmDialog.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders title, body, and both buttons when open', () => {
    render(
      <ConfirmDialog
        open
        title="Delete report?"
        body="This cannot be undone."
        confirmLabel="Delete"
        confirmTone="danger"
        pending={false}
        error={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete report?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('does not render when open=false', () => {
    render(
      <ConfirmDialog
        open={false}
        title="x"
        body="y"
        confirmLabel="ok"
        confirmTone="primary"
        pending={false}
        error={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fires onConfirm and onCancel', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="t"
        body="b"
        confirmLabel="ok"
        confirmTone="primary"
        pending={false}
        error={null}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /ok/i }));
    expect(onConfirm).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables buttons and shows pending state when pending=true', () => {
    render(
      <ConfirmDialog
        open
        title="t"
        body="b"
        confirmLabel="Delete"
        confirmTone="danger"
        pending
        error={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('renders error inline when provided', () => {
    render(
      <ConfirmDialog
        open
        title="t"
        body="b"
        confirmLabel="ok"
        confirmTone="primary"
        pending={false}
        error="Network error"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/ConfirmDialog.tsx
'use client';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  confirmTone: 'primary' | 'danger';
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  confirmTone,
  pending,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClass =
    confirmTone === 'danger'
      ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
      : 'bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
        {error && (
          <div role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/ConfirmDialog.tsx src/components/ConfirmDialog.test.tsx
git commit -m "feat(ui): generic accessible ConfirmDialog with pending/error states"
```

---

## Task 5: DeleteReportButton

**Files:**
- Create: `src/components/DeleteReportButton.tsx`
- Create: `src/components/DeleteReportButton.test.tsx`

**Step 1: Failing tests**

```typescript
// src/components/DeleteReportButton.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteReportButton } from './DeleteReportButton';

describe('DeleteReportButton', () => {
  it('opens the dialog when × is clicked', async () => {
    render(<DeleteReportButton onDelete={async () => {}} disabled={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /delete report/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onDelete on confirm and closes the dialog on success', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<DeleteReportButton onDelete={onDelete} disabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: /delete report/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the dialog open and shows error on failure', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('rls_denied'));
    render(<DeleteReportButton onDelete={onDelete} disabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: /delete report/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/rls_denied/));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('cancel closes the dialog without calling onDelete', async () => {
    const onDelete = vi.fn();
    render(<DeleteReportButton onDelete={onDelete} disabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: /delete report/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('× button is disabled when disabled=true', () => {
    render(<DeleteReportButton onDelete={async () => {}} disabled />);
    expect(screen.getByRole('button', { name: /delete report/i })).toBeDisabled();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/DeleteReportButton.tsx
'use client';

import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

export interface DeleteReportButtonProps {
  onDelete: () => Promise<void>;
  disabled: boolean;
}

export function DeleteReportButton({ onDelete, disabled }: DeleteReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation(); // don't trigger row click
    if (disabled) return;
    setError(null);
    setOpen(true);
  }

  function handleCancel() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  async function handleConfirm() {
    setPending(true);
    setError(null);
    try {
      await onDelete();
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        aria-label="Delete report"
        className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        ×
      </button>
      <ConfirmDialog
        open={open}
        title="Delete this report?"
        body="The report and its chat history will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        confirmTone="danger"
        pending={pending}
        error={error}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/DeleteReportButton.tsx src/components/DeleteReportButton.test.tsx
git commit -m "feat(ui): DeleteReportButton with ConfirmDialog flow"
```

---

## Task 6: Wire DeleteReportButton into HistoryItem

**Files:**
- Modify: `src/components/HistoryItem.tsx`
- Modify: `src/components/HistorySidebar.tsx`
- Modify: `src/components/HistorySidebar.test.tsx`

**Step 1: Update HistorySidebarProps + HistoryItemProps**

Add `onDelete?: (id: string) => Promise<void>` to both props. When provided, render a `DeleteReportButton` next to the item label.

```tsx
// src/components/HistoryItem.tsx
import type { ReportSummaryRow } from '@/lib/db/reports';
import { DeleteReportButton } from './DeleteReportButton';

export interface HistoryItemProps {
  item: ReportSummaryRow;
  active: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
}

export function HistoryItem({ item, active, disabled, onSelect, onDelete }: HistoryItemProps) {
  const date = new Date(item.created_at);
  const label = item.title || `Report from ${date.toLocaleDateString()}`;
  const time = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex items-start gap-2 rounded-md border px-3 py-2 transition-colors ${
        active ? 'border-slate-700 bg-slate-100' : 'border-slate-200 bg-white hover:border-slate-400'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        disabled={disabled}
        className="flex flex-1 flex-col items-start text-left text-sm disabled:opacity-50"
      >
        <span className="font-medium text-slate-800">{label}</span>
        <span className="text-xs text-slate-500">{time}</span>
      </button>
      {onDelete && (
        <DeleteReportButton onDelete={() => onDelete(item.id)} disabled={disabled} />
      )}
    </div>
  );
}
```

```tsx
// src/components/HistorySidebar.tsx — update props and pass through
export interface HistorySidebarProps {
  items: ReportSummaryRow[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete?: (id: string) => Promise<void>;
  disabled: boolean;
}

// pass `onDelete={onDelete}` to each <HistoryItem />
```

**Step 2: Update existing HistorySidebar tests** to pass `onDelete` in some cases.

Add a new test:

```typescript
it('renders a delete button when onDelete prop is provided', () => {
  render(
    <HistorySidebar
      items={[{ id: 'r-1', title: 'CBC', created_at: '2026-05-01T00:00:00Z', target_lang: 'hi' }]}
      activeId={null}
      onSelect={() => {}}
      onNew={() => {}}
      onDelete={async () => {}}
      disabled={false}
    />,
  );
  expect(screen.getByRole('button', { name: /delete report/i })).toBeInTheDocument();
});

it('does not render delete button when onDelete is omitted', () => {
  render(
    <HistorySidebar
      items={[{ id: 'r-1', title: 'CBC', created_at: '2026-05-01T00:00:00Z', target_lang: 'hi' }]}
      activeId={null}
      onSelect={() => {}}
      onNew={() => {}}
      disabled={false}
    />,
  );
  expect(screen.queryByRole('button', { name: /delete report/i })).not.toBeInTheDocument();
});
```

The existing test `'calls onSelect with id on click'` may break because the row is now a `<div>` with the label inside a `<button>`. Update its query: `screen.getByRole('button', { name: /CBC/ })` still works since the label-button has the accessible name.

Verify by running.

**Step 3: Run** → PASS.

**Step 4: Commit**

```bash
git add src/components/HistoryItem.tsx src/components/HistorySidebar.tsx src/components/HistorySidebar.test.tsx
git commit -m "feat(ui): wire DeleteReportButton into HistoryItem when onDelete provided"
```

---

## Task 7: ConsentToggles component

**Files:**
- Create: `src/components/ConsentToggles.tsx`
- Create: `src/components/ConsentToggles.test.tsx`

**Step 1: Failing test**

```typescript
// src/components/ConsentToggles.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentToggles } from './ConsentToggles';
import { DEFAULT_CONSENTS } from '@/lib/db/consents';

describe('ConsentToggles', () => {
  it('renders three labelled switches with descriptions', () => {
    render(<ConsentToggles values={DEFAULT_CONSENTS} disabled={false} onChange={() => {}} />);
    expect(screen.getByLabelText(/save reports/i)).toBeChecked();
    expect(screen.getByLabelText(/save chat/i)).toBeChecked();
    expect(screen.getByLabelText(/save voice/i)).toBeChecked();
  });

  it('fires onChange with the right key and new value', async () => {
    const onChange = vi.fn();
    render(<ConsentToggles values={DEFAULT_CONSENTS} disabled={false} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText(/save chat/i));
    expect(onChange).toHaveBeenCalledWith('store_chat', false);
  });

  it('disables all toggles when disabled=true', () => {
    render(<ConsentToggles values={DEFAULT_CONSENTS} disabled onChange={() => {}} />);
    expect(screen.getByLabelText(/save reports/i)).toBeDisabled();
    expect(screen.getByLabelText(/save chat/i)).toBeDisabled();
    expect(screen.getByLabelText(/save voice/i)).toBeDisabled();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/ConsentToggles.tsx
'use client';

import type { ConsentValues } from '@/lib/db/consents';

interface Toggle {
  key: keyof ConsentValues;
  label: string;
  description: string;
}

const TOGGLES: Toggle[] = [
  {
    key: 'store_reports',
    label: 'Save reports to your history',
    description:
      'When off, uploaded reports stay only in your current browser tab. Closing the tab loses them.',
  },
  {
    key: 'store_chat',
    label: 'Save chat history',
    description:
      'When off, your questions and the assistant\'s replies are not saved. Summaries still are.',
  },
  {
    key: 'store_voice_transcripts',
    label: 'Save voice transcripts',
    description:
      'When off, anything you say (after voice is enabled) will not be transcribed or saved.',
  },
];

export interface ConsentTogglesProps {
  values: ConsentValues;
  disabled: boolean;
  onChange: (key: keyof ConsentValues, next: boolean) => void;
}

export function ConsentToggles({ values, disabled, onChange }: ConsentTogglesProps) {
  return (
    <div className="flex flex-col gap-5">
      {TOGGLES.map((t) => (
        <label key={t.key} className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={values[t.key]}
            disabled={disabled}
            onChange={(e) => onChange(t.key, e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300 disabled:opacity-50"
          />
          <span className="flex flex-col">
            <span className="text-base font-medium text-slate-900">{t.label}</span>
            <span className="text-sm text-slate-600">{t.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/ConsentToggles.tsx src/components/ConsentToggles.test.tsx
git commit -m "feat(ui): ConsentToggles with three labelled switches and descriptions"
```

---

## Task 8: Settings page

**Files:**
- Create: `src/app/settings/page.tsx`

**Step 1: Implementation**

```tsx
// src/app/settings/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGate } from '@/components/AuthGate';
import { ConsentToggles } from '@/components/ConsentToggles';
import { useSession } from '@/lib/auth/useSession';
import { getBrowserSupabase } from '@/lib/supabase/browserClient';
import {
  getConsents,
  updateConsents,
  DEFAULT_CONSENTS,
  type ConsentValues,
} from '@/lib/db/consents';
import { useReportStore } from '@/store/useReportStore';

function SettingsContent() {
  const { session } = useSession();
  const supabase = getBrowserSupabase();
  const consents = useReportStore((s) => s.consents);
  const setConsents = useReportStore((s) => s.setConsents);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(
    async (userId: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const values = await getConsents(supabase, userId);
        setConsents(values);
      } catch (e) {
        setLoadError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [supabase, setConsents],
  );

  useEffect(() => {
    if (session?.user?.id) load(session.user.id);
  }, [session?.user?.id, load]);

  async function handleChange(key: keyof ConsentValues, next: boolean) {
    if (!session?.user?.id) return;
    const previous = consents;
    const optimistic = { ...consents, [key]: next };
    setConsents(optimistic);
    try {
      await updateConsents(supabase, session.user.id, { [key]: next });
      setToast(null);
    } catch (e) {
      setConsents(previous);
      setToast(`Couldn't save your preference: ${(e as Error).message}`);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Link href="/" className="text-sm text-slate-600 underline">
          Back
        </Link>
      </header>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">Privacy</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose what gets saved to your account. Changes apply immediately.
        </p>

        {loadError && (
          <div role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            Couldn&apos;t load your settings: {loadError}{' '}
            <button
              type="button"
              className="underline"
              onClick={() => session?.user?.id && load(session.user.id)}
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-6">
          <ConsentToggles
            values={loading ? DEFAULT_CONSENTS : consents}
            disabled={loading || !!loadError}
            onChange={handleChange}
          />
        </div>

        {toast && (
          <div role="status" className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            {toast}
          </div>
        )}
      </section>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsContent />
    </AuthGate>
  );
}
```

**Step 2: Verify build**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(ui): /settings page with privacy section and optimistic toggles"
```

---

## Task 9: Wire delete + consents into the home page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add settings link, load consents on mount, gate writes, wire delete handler**

Read current `src/app/page.tsx` first. Then:

1. Add `import Link from 'next/link';`
2. Add the consents load effect at the top of `HomeContent`:

```tsx
const consents = useReportStore((s) => s.consents);
const setConsents = useReportStore((s) => s.setConsents);

useEffect(() => {
  if (!session?.user?.id) return;
  getConsents(supabase, session.user.id)
    .then(setConsents)
    .catch(() => {
      // keep defaults; non-fatal
    });
}, [session?.user?.id, supabase, setConsents]);
```

(import `getConsents` from `@/lib/db/consents`.)

3. Gate `createReport`:

```tsx
let reportId: string | null = null;
if (consents.store_reports) {
  try {
    const inserted = await createReport(supabase, { ...payload });
    reportId = inserted.id;
  } catch (e) {
    setUploadError(`Couldn't save your report. ${(e as Error).message}`);
    return;
  }
}
useReportStore.getState().setReport({
  id: reportId,
  originalText: result.original_text,
  pageCount: result.page_count,
  sourceLang: (result.source_language as Language) ?? language,
});
```

4. Gate the summary `createMessage`:

```tsx
const finalSummary = useReportStore.getState().summary;
if (reportId && finalSummary.trim().length > 0 && consents.store_reports) {
  try {
    await createMessage(supabase, { reportId, userId, role: 'assistant', content: finalSummary });
  } catch (e) { console.error('save_summary_failed', (e as Error).message); }
}
```

(Note: `streamSummary` needs to receive `reportId: string | null` — only persist when non-null.)

5. Gate chat `createMessage` (both user + assistant) on `consents.store_chat && report.id`:

```tsx
if (consents.store_chat && report.id) {
  await createMessage(supabase, { ... });
}
```

6. Skip `refreshHistory` when no persistence happened (i.e. when `consents.store_reports === false`), since there is nothing new in DB. The existing call is still safe (returns the same list), so leave it.

7. Add the delete handler:

```tsx
async function handleDeleteReport(id: string) {
  if (!session) return;
  await deleteReport(supabase, id);
  if (report?.id === id) {
    useReportStore.getState().clearReport();
  }
  await refreshHistory(session.user.id);
}
```

(import `deleteReport` from `@/lib/db/reports`.)

8. Pass `onDelete={handleDeleteReport}` to `<HistorySidebar>`.

9. Add a Settings link in the header:

```tsx
<Link href="/settings" className="text-sm text-slate-600 underline">
  Settings
</Link>
```

**Step 2: Verify**

```bash
pnpm test && pnpm lint && pnpm build
```

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(ui): wire delete + load consents + gate writes + Settings link"
```

---

## Task 10: Final smoke + PR

**Step 1: Manual smoke**

1. Sign in. Upload report. Sidebar shows it.
2. Click × on the row → confirm dialog → delete → vanishes from sidebar; if active, upload zone returns.
3. Visit `/settings` → see three toggles, all on.
4. Toggle "Save reports" off → upload a new report → Supabase Table Editor shows no new row.
5. Toggle back on → next upload writes again.
6. Toggle "Save chat" off (with reports on) → upload + chat → Table Editor: report row + 1 assistant message (the summary) but no user/assistant turns from chat.
7. Toggle voice toggle — no-op functionally; just confirm it persists.

**Step 2: Push branch**

```bash
git push -u origin feat/privacy-controls
```

**Step 3: Open PR**

```bash
gh pr create --base master \
  --title "feat: per-report delete + settings page with consent toggles (closes Phase 4)" \
  --body "$(cat <<'EOF'
## Summary
- Per-report **delete** button in the history sidebar with a confirm dialog. Deletes cascade to messages via the existing FK.
- New **/settings** page exposing the `consents` table: three toggle switches (`store_reports`, `store_chat`, `store_voice_transcripts`).
- Page write paths now respect consents:
  - `store_reports = false` → no DB writes at all (in-memory only for the session).
  - `store_reports = true && store_chat = false` → report + summary persist; user/assistant chat turns do not.
  - Voice toggle is wired but functionally a no-op until Phase 6.
- No new migrations.

## Design + plan
- `docs/plans/2026-05-02-privacy-controls-design.md`
- `docs/plans/2026-05-02-privacy-controls.md`

## Test plan
- [ ] `pnpm install && pnpm test` — all green
- [ ] `pnpm build` — succeeds
- [ ] Sign in → upload → click × on the row → confirm → row vanishes
- [ ] Visit `/settings` → toggles render with all-on defaults
- [ ] Toggle "Save reports" off → upload → no row in Supabase Table Editor
- [ ] Toggle back on → upload → row appears
- [ ] Toggle "Save chat" off → upload + chat → DB has report + summary message but no user/assistant turns
- [ ] Refresh `/settings` → toggle states persisted
- [ ] Sign out + sign back in → toggle states still there

## Out of scope
- Bulk "delete all my data" / account closure flow.
- Profile fields (display name, phone).
- Phase 5 — Maps.
- Phase 6 — voice (will activate the third toggle).
EOF
)"
```

---

## Done definition

- All 10 tasks committed.
- `pnpm test` passes.
- `pnpm build` succeeds.
- Manual smoke confirms delete + all three toggle behaviours.
- PR open against `master`.
