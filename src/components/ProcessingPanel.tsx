'use client';

import { useEffect, useState } from 'react';
import { Check, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  'Reading the document',
  'Recognising medical terms',
  'Translating to your language',
  'Drafting a plain-language summary',
];

/**
 * Shown while an OCR + summarise round-trip is in flight. The step list is a
 * visual heartbeat — actual progress events aren't streamed back from the
 * backend so we cycle through stages on a timer that approximates real
 * timings (about 6s end-to-end).
 */
export function ProcessingPanel() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= STEPS.length - 1) return;
    const id = window.setTimeout(() => setStage((s) => s + 1), 1600);
    return () => window.clearTimeout(id);
  }, [stage]);

  return (
    <div className="mx-auto mt-10 max-w-[560px] text-center">
      <div className="relative mx-auto mb-5 grid h-24 w-24 place-items-center rounded-full bg-teal-soft">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-pulse-ring rounded-full border-2 border-teal opacity-0"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-pulse-ring rounded-full border-2 border-teal opacity-0"
          style={{ animationDelay: '1.2s' }}
        />
        <FileText className="h-9 w-9 text-teal-deep" strokeWidth={1.5} />
      </div>

      <h2 className="mb-1.5 font-display text-[22px] font-semibold tracking-[-0.015em]">
        Reading your report…
      </h2>
      <p className="mb-7 text-[14px] text-muted">
        This usually takes a few seconds. We&apos;ll stay quiet until we have something useful.
      </p>

      <ol className="flex flex-col gap-2 rounded-md border border-line bg-surface px-5 py-3.5 text-left">
        {STEPS.map((label, i) => {
          const isDone = i < stage;
          const isActive = i === stage;
          return (
            <li
              key={label}
              className={cn(
                'flex items-center gap-3 text-[13px] transition-colors',
                isActive || isDone ? 'text-ink-2' : 'text-muted',
                isActive && 'font-medium',
              )}
            >
              <span
                className={cn(
                  'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]',
                  isDone && 'border-teal bg-teal text-white',
                  isActive && 'animate-spin-slow border-teal border-t-transparent',
                  !isActive && !isDone && 'border-line-2',
                )}
                aria-hidden
              >
                {isDone && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
