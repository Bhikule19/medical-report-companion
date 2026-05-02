'use client';

import { LANGUAGES } from '@/lib/types';
import { useReportStore } from '@/store/useReportStore';

export function LanguagePicker() {
  const language = useReportStore((s) => s.language);
  const setLanguage = useReportStore((s) => s.setLanguage);

  return (
    <label className="flex items-center gap-3 text-base">
      <span className="font-medium">Language</span>
      <select
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus:border-slate-500 focus:outline-none"
        value={language}
        onChange={(e) => setLanguage(e.target.value as typeof language)}
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
