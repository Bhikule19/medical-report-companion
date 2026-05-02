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
    <label className="flex items-center gap-3 text-base">
      <span className="font-medium">Language</span>
      <select
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus:border-slate-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
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
