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
    <aside className="flex h-full w-full flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-card">
      <button
        type="button"
        onClick={onNew}
        disabled={disabled}
        className="rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary transition-colors hover:bg-primary disabled:bg-on-surface-variant disabled:opacity-60"
      >
        New report
      </button>
      <h2 className="font-display text-label-caps uppercase tracking-wider text-on-surface-variant">
        Past reports
      </h2>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {items.length === 0 && (
          <p className="text-body-md text-on-surface-variant">No past reports yet.</p>
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
