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
