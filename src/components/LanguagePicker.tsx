'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { LANGUAGES, type Language } from '@/lib/types';
import { useReportStore } from '@/store/useReportStore';
import { cn } from '@/lib/utils';

export interface LanguagePickerProps {
  onChange?: (language: Language) => void;
  disabled?: boolean;
}

// `LANGUAGES` in lib/types is the canonical list, but `label` already holds
// the native-script name (e.g. हिन्दी, தமிழ்) — so we can use it directly for
// the in-menu native display.
export function LanguagePicker({ onChange, disabled }: LanguagePickerProps = {}) {
  const language = useReportStore((s) => s.language);
  const setLanguage = useReportStore((s) => s.setLanguage);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function handleSelect(next: Language) {
    setLanguage(next);
    onChange?.(next);
    setOpen(false);
  }

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label="Language"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[9px] border border-line-2 bg-surface py-[7px] pl-3 pr-2.5 text-[13px] font-medium text-ink-2 transition-colors',
          'hover:bg-surface-2',
          disabled && 'cursor-not-allowed opacity-60 hover:bg-surface',
        )}
      >
        <Globe className="h-3.5 w-3.5 text-muted" aria-hidden />
        <span>{current.label}</span>
        <ChevronDown className="h-3 w-3 text-muted" aria-hidden />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Choose display language"
          className="absolute right-0 top-[calc(100%+6px)] z-50 max-h-[360px] w-[220px] overflow-y-auto rounded-md border border-line bg-surface p-1.5 shadow-lg"
        >
          {LANGUAGES.map((l) => {
            const isActive = l.code === language;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(l.code)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13px] transition-colors',
                    'hover:bg-surface-2',
                    isActive && 'bg-teal-soft text-teal-deep hover:bg-teal-soft',
                  )}
                >
                  <span className="flex-1 truncate">{l.label}</span>
                  <span
                    className={cn(
                      'ml-auto font-mono text-[10px] uppercase tracking-wide text-muted',
                      isActive && 'text-teal',
                    )}
                  >
                    {l.code}
                  </span>
                  {isActive && <Check className="h-3.5 w-3.5 text-teal" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
