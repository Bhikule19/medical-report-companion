import type { Language } from '@/lib/types';
import { SpeakButton } from './SpeakButton';

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
  onSpeak?: (text: string) => Promise<Blob>;
}

export function ReportSummary({
  summary,
  pageCount,
  sourceLang,
  streaming,
  onSpeak,
}: ReportSummaryProps) {
  const canSpeak = !streaming && summary.trim().length > 0 && onSpeak !== undefined;

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <header className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>Source: {LANG_NAME[sourceLang]}</span>
        <div className="flex items-center gap-2">
          {pageCount != null && (
            <span>
              {pageCount} page{pageCount === 1 ? '' : 's'}
            </span>
          )}
          {canSpeak && onSpeak && <SpeakButton text={summary} onPlay={onSpeak} />}
        </div>
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
