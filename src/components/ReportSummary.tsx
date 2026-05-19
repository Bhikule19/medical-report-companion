import { FileText } from 'lucide-react';
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

/**
 * Summary panel. Shows a gradient hero with translation metadata, followed by
 * the streamed body text. The streaming caret is preserved so the cursor blink
 * keeps working without re-rendering the whole panel.
 */
export function ReportSummary({
  summary,
  pageCount,
  sourceLang,
  streaming,
  onSpeak,
}: ReportSummaryProps) {
  const canSpeak = !streaming && summary.trim().length > 0 && onSpeak !== undefined;

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <header className="relative overflow-hidden border-b border-teal-tint bg-gradient-to-br from-teal-soft to-blue-soft px-6 py-5">
        <span
          aria-hidden
          className="absolute -right-10 -top-10 h-44 w-44 rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, rgb(14 124 123 / 0.10), transparent)',
          }}
        />
        <div className="relative">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-teal-deep">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 font-medium">
              <FileText className="h-3 w-3" aria-hidden />
              Source: {LANG_NAME[sourceLang]}
            </span>
            {pageCount != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 font-medium">
                {pageCount} page{pageCount === 1 ? '' : 's'}
              </span>
            )}
            {canSpeak && onSpeak && <SpeakButton text={summary} onPlay={onSpeak} />}
          </div>
          <h2 className="font-display text-[clamp(20px,2.6vw,26px)] font-semibold leading-tight tracking-[-0.01em]">
            Plain-language summary
          </h2>
          <p className="mt-1.5 max-w-[80%] text-[14px] leading-snug text-ink-2">
            What each value means, written for family who aren&apos;t doctors.
          </p>
        </div>
      </header>

      <div className="px-6 py-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">
          The bottom line
        </p>
        <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">
          {summary || (streaming ? '' : 'Your summary will appear here once a report is uploaded.')}
          {streaming && (
            <span
              aria-label="Generating summary"
              className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-teal align-baseline"
            />
          )}
        </div>
      </div>
    </section>
  );
}
