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
    <div
      className={`flex items-start gap-2 rounded-md border px-3 py-2 transition-colors ${
        active
          ? 'border-secondary bg-secondary-container/40'
          : 'border-outline-variant bg-surface-container-lowest hover:border-outline'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        disabled={disabled}
        className="flex flex-1 flex-col items-start text-left disabled:opacity-50"
      >
        <span className="text-body-md font-medium text-on-surface">{label}</span>
        <span className="text-label-caps text-on-surface-variant normal-case tracking-normal">
          {time}
        </span>
      </button>
      {onDelete && (
        <DeleteReportButton onDelete={() => onDelete(item.id)} disabled={disabled} />
      )}
    </div>
  );
}
