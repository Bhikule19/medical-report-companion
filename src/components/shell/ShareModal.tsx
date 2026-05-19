'use client';

import { useState } from 'react';
import { Copy, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShareModalProps {
  onClose: () => void;
  onToast: (msg: string) => void;
}

/**
 * Stubbed share dialog — surfaces the same visual language as the design but
 * doesn't yet wire to a real shareable-link backend. Copy puts the canonical
 * URL on the clipboard so the entry point can land before backend work.
 */
export function ShareModal({ onClose, onToast }: ShareModalProps) {
  const [hideValues, setHideValues] = useState(false);
  const [shortExpiry, setShortExpiry] = useState(true);

  const sampleLink = 'https://medical-report-companion.app/share/preview';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sampleLink);
      onToast('Link copied to clipboard');
    } catch {
      onToast("Couldn't copy. Long-press to copy manually.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid animate-fade-in place-items-center bg-ink/40 p-5 backdrop-blur-[4px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="w-full max-w-[480px] animate-modal-in overflow-hidden rounded-xl bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-line px-5 pb-3 pt-5">
          <div>
            <h2 id="share-modal-title" className="text-[18px] font-semibold tracking-[-0.01em]">
              Share report
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Read-only link that anyone in your family can open.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-4">
          <div className="mb-4 flex items-center gap-1 rounded-[10px] border border-line bg-surface-2 py-1 pl-3 pr-1 font-mono text-[12px]">
            <input
              readOnly
              value={sampleLink}
              className="flex-1 border-none bg-transparent text-ink-2 outline-none"
              aria-label="Share link"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md bg-teal px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-teal-deep"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>

          <ShareToggle
            label="Hide individual values"
            sub="Family sees the summary and what to do, but not the raw numbers."
            on={hideValues}
            onChange={setHideValues}
          />
          <ShareToggle
            label="Expire in 7 days"
            sub="Link stops working after a week. You can re-share at any time."
            on={shortExpiry}
            onChange={setShortExpiry}
          />
        </div>

        <footer className="flex justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line-2 bg-surface px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

interface ShareToggleProps {
  label: string;
  sub: string;
  on: boolean;
  onChange: (next: boolean) => void;
}

function ShareToggle({ label, sub, on, onChange }: ShareToggleProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 border-t border-line py-3 first:border-t-0">
      <span>
        <span className="block text-[13px]">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted">{sub}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          on ? 'bg-teal' : 'bg-line-2',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            on ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}
