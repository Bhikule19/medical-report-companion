'use client';

import type { ReportSummaryRow } from '@/lib/db/reports';
import { HistoryItem } from './HistoryItem';

export interface HistorySidebarProps {
  items: ReportSummaryRow[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete?: (id: string) => Promise<void>;
  disabled: boolean;
}

export function HistorySidebar({
  items,
  activeId,
  onSelect,
  onNew,
  onDelete,
  disabled,
}: HistorySidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
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
            onDelete={onDelete}
          />
        ))}
      </div>
    </aside>
  );
}
