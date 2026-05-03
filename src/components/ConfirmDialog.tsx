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
      ? 'bg-error hover:bg-error/90 disabled:opacity-60'
      : 'bg-primary-container hover:bg-primary disabled:opacity-60';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-card-hover">
        <h2 id="confirm-title" className="font-display text-headline text-on-surface">
          {title}
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">{body}</p>
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md bg-error-container p-3 text-body-md text-on-error-container"
          >
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-outline-variant px-4 py-2 text-body-md text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-md px-4 py-2 text-body-md font-medium text-on-primary transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
