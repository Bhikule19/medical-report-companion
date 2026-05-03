import type { Language } from '@/lib/types';
import { SpeakButton } from './SpeakButton';

const LANG_NAME: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese',
  ar: 'Arabic',
  ja: 'Japanese',
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
    <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
      <header className="mb-4 flex items-center justify-between text-label-caps uppercase tracking-wider text-on-surface-variant">
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
      <div className="whitespace-pre-wrap text-body-lg text-on-surface">
        {summary}
        {streaming && (
          <span
            aria-label="Generating summary"
            className="ml-1 inline-block h-4 w-2 animate-pulse rounded bg-secondary align-middle"
          />
        )}
      </div>
    </section>
  );
}
