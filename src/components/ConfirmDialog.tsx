'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                key="content"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-card-hover focus:outline-none"
              >
                <Dialog.Title className="font-display text-headline text-on-surface">
                  {title}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-body-md text-on-surface-variant">
                  {body}
                </Dialog.Description>
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
                    className={cn(
                      'rounded-md px-4 py-2 text-body-md font-medium text-on-primary transition-colors disabled:opacity-60',
                      confirmTone === 'danger'
                        ? 'bg-error hover:bg-error/90'
                        : 'bg-primary-container hover:bg-primary',
                    )}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
