'use client';

import { useState, type MouseEvent } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

export interface DeleteReportButtonProps {
  onDelete: () => Promise<void>;
  disabled: boolean;
}

export function DeleteReportButton({ onDelete, disabled }: DeleteReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen(e: MouseEvent) {
    e.stopPropagation();
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
        className="rounded-md p-1 text-lg leading-none text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container disabled:opacity-50"
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
