'use client';

import { LANGUAGES, type Language } from '@/lib/types';
import { useReportStore } from '@/store/useReportStore';

export interface LanguagePickerProps {
  onChange?: (language: Language) => void;
  disabled?: boolean;
}

export function LanguagePicker({ onChange, disabled }: LanguagePickerProps = {}) {
  const language = useReportStore((s) => s.language);
  const setLanguage = useReportStore((s) => s.setLanguage);

  function handleChange(next: Language) {
    setLanguage(next);
    onChange?.(next);
  }

  return (
    <label className="flex items-center gap-2 text-body-md text-on-surface-variant">
      <span className="font-medium">Language</span>
      <select
        className="rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface transition-colors hover:border-outline disabled:bg-surface-container disabled:text-on-surface-variant"
        value={language}
        onChange={(e) => handleChange(e.target.value as Language)}
        disabled={disabled}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
