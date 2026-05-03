'use client';

import { Plus } from 'lucide-react';
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
    <aside className="sticky top-24 flex w-full flex-col gap-5">
      <button
        type="button"
        onClick={onNew}
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-container px-4 py-2.5 text-body-md font-medium text-on-primary transition-all hover:-translate-y-px hover:bg-primary hover:shadow-card disabled:translate-y-0 disabled:bg-on-surface-variant disabled:opacity-60 disabled:shadow-none"
      >
        <Plus className="h-4 w-4" aria-hidden />
        New report
      </button>

      <div className="flex items-center gap-3">
        <h2 className="font-display text-label-caps uppercase tracking-wider text-on-surface-variant">
          Past reports
        </h2>
        <span className="h-px flex-1 bg-outline-variant" aria-hidden />
        {items.length > 0 && (
          <span className="text-label-caps tabular-nums text-on-surface-variant">
            {items.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto pb-4">
        {items.length === 0 && (
          <p className="text-body-md text-on-surface-variant">
            Nothing here yet. Your past reports will appear here once you upload one.
          </p>
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
