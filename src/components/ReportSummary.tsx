import type { Language } from '@/lib/types';

const LANG_NAME: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
};

export interface ReportSummaryProps {
  summary: string;
  pageCount: number | null;
  sourceLang: Language;
  streaming: boolean;
}

export function ReportSummary({ summary, pageCount, sourceLang, streaming }: ReportSummaryProps) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <header className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>Source: {LANG_NAME[sourceLang]}</span>
        {pageCount != null && (
          <span>
            {pageCount} page{pageCount === 1 ? '' : 's'}
          </span>
        )}
      </header>
      <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-800">
        {summary}
        {streaming && (
          <span
            aria-label="Generating summary"
            className="ml-1 inline-block h-4 w-2 animate-pulse bg-slate-400 align-middle"
          />
        )}
      </div>
    </section>
  );
}
