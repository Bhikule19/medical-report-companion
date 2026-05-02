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
          ? 'border-slate-700 bg-slate-100'
          : 'border-slate-200 bg-white hover:border-slate-400'
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
