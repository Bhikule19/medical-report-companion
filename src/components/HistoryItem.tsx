'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReportSummaryRow } from '@/lib/db/reports';
import { DeleteReportButton } from './DeleteReportButton';

export interface HistoryItemProps {
  item: ReportSummaryRow;
  active: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
}

export function HistoryItem({
  item,
  active,
  disabled,
  onSelect,
  onDelete,
}: HistoryItemProps) {
  const date = new Date(item.created_at);
  const label = item.title || `Report from ${date.toLocaleDateString()}`;
  const time = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group relative flex items-start gap-2 rounded-md py-2.5 pl-4 pr-2 transition-colors',
        active
          ? 'bg-secondary-container/50'
          : 'hover:bg-surface-container-low',
      )}
    >
      {active && (
        <motion.span
          layoutId="history-active-bar"
          aria-hidden
          className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-secondary"
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        disabled={disabled}
        className="flex flex-1 flex-col items-start text-left disabled:opacity-50"
      >
        <span
          className={cn(
            'text-body-md font-medium',
            active ? 'text-on-surface' : 'text-on-surface',
          )}
        >
          {label}
        </span>
        <span className="text-label-caps text-on-surface-variant normal-case tracking-normal">
          {time}
        </span>
      </button>
      {onDelete && (
        <div className={cn('opacity-0 transition-opacity group-hover:opacity-100', active && 'opacity-100')}>
          <DeleteReportButton onDelete={() => onDelete(item.id)} disabled={disabled} />
        </div>
      )}
    </motion.div>
  );
}
