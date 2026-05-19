'use client';

import { useEffect } from 'react';
import { Check } from 'lucide-react';

export interface ToastProps {
  message: string;
  onDone: () => void;
  durationMs?: number;
}

export function Toast({ message, onDone, durationMs = 2200 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDone, durationMs);
    return () => window.clearTimeout(id);
  }, [message, durationMs, onDone]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 animate-toast-in items-center gap-2 rounded-[10px] bg-ink px-4.5 py-[11px] text-[13px] text-white shadow-lg"
      style={{ padding: '11px 18px' }}
    >
      <Check className="h-[14px] w-[14px]" aria-hidden />
      {message}
    </div>
  );
}
