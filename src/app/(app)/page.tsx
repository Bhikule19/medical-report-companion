'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  HeartPulse,
  Languages,
  Lock,
  Mic,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { UploadZone } from '@/components/UploadZone';
import { ReportSummary } from '@/components/ReportSummary';
import { ChatPanel } from '@/components/ChatPanel';
import { Topbar } from '@/components/shell/Topbar';
import { ProcessingPanel } from '@/components/ProcessingPanel';
import { useReportStore } from '@/store/useReportStore';
import { ocrTranslate, OcrError } from '@/lib/api/ocrTranslate';
import { chat } from '@/lib/api/chat';
import { transcribeAudio, synthesizeSpeech } from '@/lib/api/voice';
import { getSupabaseConfig } from '@/lib/env';
import { useSession } from '@/lib/auth/useSession';
import { getBrowserSupabase } from '@/lib/supabase/browserClient';
import { createReport, listReports } from '@/lib/db/reports';
import {
  clearChatMessagesKeepingSummary,
  createMessage,
} from '@/lib/db/messages';
import { getConsents } from '@/lib/db/consents';
import type { Language } from '@/lib/types';

const config = getSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

function deriveTitle(file: File): string {
  const stem = file.name.replace(/\.[^.]+$/, '').trim();
  return stem || `Report from ${new Date().toLocaleDateString()}`;
}

export default function HomePage() {
  const router = useRouter();
  const { session } = useSession();
  const supabase = getBrowserSupabase();

  const language = useReportStore((s) => s.language);
  const report = useReportStore((s) => s.report);
  const summary = useReportStore((s) => s.summary);
  const summaryStreaming = useReportStore((s) => s.summaryStreaming);
  const messages = useReportStore((s) => s.messages);
  const chatStreaming = useReportStore((s) => s.chatStreaming);
  const consents = useReportStore((s) => s.consents);
  const setConsents = useReportStore((s) => s.setConsents);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  // Default the side chat panel to open on desktop. Mobile users summon it
  // with the topbar 'AI chat' button — closed by default so the summary owns
  // the first screen.
  const [chatOpen, setChatOpen] = useState(true);

  const refreshHistory = useCallback(
    async (userId: string) => {
      try {
        const rows = await listReports(supabase, userId);
        useReportStore.getState().setHistoryList(rows);
        setHistoryError(null);
      } catch (e) {
        setHistoryError((e as Error).message);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (session?.user?.id) refreshHistory(session.user.id);
  }, [session?.user?.id, refreshHistory]);

  useEffect(() => {
    if (!session?.user?.id) return;
    getConsents(supabase, session.user.id)
      .then(setConsents)
      .catch(() => {
        // Non-fatal: keep defaults (all on) so existing behaviour is preserved.
      });
  }, [session?.user?.id, supabase, setConsents]);

  function bounceToSignIn() {
    router.replace('/sign-in?error=session_expired');
  }

  async function handleFile(file: File) {
    if (!session) return bounceToSignIn();
    setUploadError(null);
    setUploading(true);
    try {
      const result = await ocrTranslate({
        file,
        targetLang: language,
        accessToken: session.access_token,
        config,
      });

      let reportId: string | null = null;
      if (consents.store_reports) {
        try {
          const inserted = await createReport(supabase, {
            userId: session.user.id,
            title: deriveTitle(file),
            extractedText: result.original_text,
            translatedText: result.translated_text ?? null,
            sourceLang: (result.source_language as Language) ?? null,
            targetLang: language,
            pageCount: result.page_count,
          });
          reportId = inserted.id;
        } catch (e) {
          setUploadError(`Couldn't save your report. ${(e as Error).message}`);
          return;
        }
      }

      useReportStore.getState().setReport({
        id: reportId,
        originalText: result.original_text,
        pageCount: result.page_count,
        sourceLang: (result.source_language as Language) ?? language,
      });

      await streamSummary(
        reportId,
        result.original_text,
        language,
        session.access_token,
        session.user.id,
      );
      if (consents.store_reports) await refreshHistory(session.user.id);
    } catch (e) {
      if (e instanceof OcrError && e.status === 401) return bounceToSignIn();
      if (e instanceof OcrError && e.status === 429 && e.retryAfterSeconds) {
        setUploadError(`Too many requests. Try again in ${e.retryAfterSeconds}s.`);
      } else if (e instanceof OcrError && e.message === 'no_text_extracted') {
        setUploadError(
          "Couldn't read any text from this document. Please upload a clearer file or a digital PDF.",
        );
      } else if (e instanceof OcrError) {
        setUploadError(`Upload failed: ${e.message}`);
      } else {
        setUploadError(e instanceof Error ? e.message : 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  }

  async function streamSummary(
    reportId: string | null,
    reportText: string,
    lang: Language,
    accessToken: string,
    userId: string,
  ) {
    const store = useReportStore.getState();
    useReportStore.setState({ summary: '' });
    store.setSummaryStreaming(true);
    try {
      for await (const ev of chat({
        mode: 'summary',
        reportText,
        language: lang,
        accessToken,
        config,
      })) {
        if (ev.kind === 'chunk') store.appendSummary(ev.text);
        else if (ev.kind === 'footer') store.appendSummary(`\n\n${ev.text}`);
        else if (ev.kind === 'error') store.appendSummary(`\n\n(error: ${ev.message})`);
      }
      const finalSummary = useReportStore.getState().summary;
      if (reportId && finalSummary.trim().length > 0) {
        try {
          await createMessage(supabase, {
            reportId,
            userId,
            role: 'assistant',
            content: finalSummary,
          });
        } catch (e) {
          console.error('save_summary_failed', (e as Error).message);
        }
      }
    } finally {
      useReportStore.getState().setSummaryStreaming(false);
    }
  }

  async function handleSendChat(question: string, voiceInput?: boolean) {
    if (!report || !session) return;
    const reportId = report.id;
    const userId = session.user.id;
    const store = useReportStore.getState();
    const history = store.messages;
    const isVoiceMessage = !!voiceInput;
    const persistUserMessage =
      consents.store_chat &&
      reportId !== null &&
      (!isVoiceMessage || consents.store_voice_transcripts);
    const persistAssistantMessage = consents.store_chat && reportId !== null;

    store.appendUserMessage(question);
    if (persistUserMessage && reportId) {
      try {
        await createMessage(supabase, {
          reportId,
          userId,
          role: 'user',
          content: question,
          voiceInput: isVoiceMessage,
        });
      } catch (e) {
        console.error('save_user_message_failed', (e as Error).message);
      }
    }

    store.setChatStreaming(true);
    try {
      for await (const ev of chat({
        mode: 'chat',
        reportText: report.originalText,
        language,
        accessToken: session.access_token,
        history,
        question,
        config,
      })) {
        if (ev.kind === 'chunk') store.appendAssistantChunk(ev.text);
        else if (ev.kind === 'footer') store.appendAssistantChunk(`\n\n${ev.text}`);
        else if (ev.kind === 'error') store.appendAssistantChunk(`\n\n(error: ${ev.message})`);
      }
      const all = useReportStore.getState().messages;
      const last = all[all.length - 1];
      if (
        persistAssistantMessage &&
        reportId &&
        last?.role === 'assistant' &&
        last.content.trim().length > 0
      ) {
        try {
          await createMessage(supabase, {
            reportId,
            userId,
            role: 'assistant',
            content: last.content,
          });
        } catch (e) {
          console.error('save_assistant_message_failed', (e as Error).message);
        }
      }
    } finally {
      useReportStore.getState().setChatStreaming(false);
    }
  }

  async function handleTranscribe(blob: Blob): Promise<string> {
    if (!session) return '';
    try {
      const result = await transcribeAudio({
        blob,
        language,
        accessToken: session.access_token,
        config,
      });
      return result.transcript;
    } catch (e) {
      console.error('transcribe_failed', (e as Error).message);
      return '';
    }
  }

  async function handleSpeak(text: string): Promise<Blob> {
    if (!session) throw new Error('not_authenticated');
    return await synthesizeSpeech({
      text,
      language,
      accessToken: session.access_token,
      config,
    });
  }

  async function handleLanguageChange(nextLang: Language) {
    if (!report || !session) return;
    if (summaryStreaming || chatStreaming) return;
    await streamSummary(
      report.id,
      report.originalText,
      nextLang,
      session.access_token,
      session.user.id,
    );
  }

  async function handleClearChat() {
    if (report?.id) {
      await clearChatMessagesKeepingSummary(supabase, report.id);
    }
    useReportStore.setState({ messages: [] });
  }

  const streaming = summaryStreaming || chatStreaming || uploading;
  const hasReport = report != null;
  const showProcessing = uploading && !hasReport;

  return (
    <>
      <Topbar
        title={
          <>
            {hasReport ? 'Summary' : 'Upload report'}
            {hasReport && (
              <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-2 py-0.5 text-[11px] font-medium text-teal-deep">
                Ready
              </span>
            )}
          </>
        }
        crumb={hasReport ? 'Reports' : 'Home'}
        onLanguageChange={handleLanguageChange}
        langDisabled={summaryStreaming || chatStreaming}
        rightSlot={
          hasReport ? (
            <>
              <button
                type="button"
                aria-pressed={chatOpen}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors max-sm:hidden',
                  chatOpen
                    ? 'border-teal bg-teal text-white hover:bg-teal-deep'
                    : 'border-line-2 bg-surface text-ink-2 hover:bg-surface-2',
                )}
                onClick={() => setChatOpen((v) => !v)}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {chatOpen ? 'Hide chat' : 'AI chat'}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-teal-soft px-3 py-1.5 text-[12px] font-medium text-teal-deep hover:bg-teal-tint max-sm:hidden"
                onClick={() => window.dispatchEvent(new CustomEvent('app:share'))}
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                Share
              </button>
            </>
          ) : null
        }
      />

      {hasReport ? (
        // Loaded state owns the full height — the LoadedView gives each column
        // its own scroll container so the chat composer never leaves the view.
        <LoadedView
          summary={summary}
          pageCount={report.pageCount}
          sourceLang={report.sourceLang}
          summaryStreaming={summaryStreaming}
          messages={messages}
          chatStreaming={chatStreaming}
          streaming={streaming}
          historyError={historyError}
          onRetryHistory={() => session?.user?.id && refreshHistory(session.user.id)}
          onSendChat={handleSendChat}
          onTranscribe={handleTranscribe}
          onSpeak={handleSpeak}
          onClearChat={handleClearChat}
          chatOpen={chatOpen}
          onCloseChat={() => setChatOpen(false)}
          onOpenChat={() => setChatOpen(true)}
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-8 py-7 max-sm:px-4 max-sm:py-4">
          {historyError && (
            <div
              role="alert"
              className="mb-6 rounded-md border border-amber-soft bg-amber-soft/40 p-3 text-[13px] text-amber"
            >
              Couldn&apos;t load history: {historyError}{' '}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => session?.user?.id && refreshHistory(session.user.id)}
              >
                Retry
              </button>
            </div>
          )}
          {showProcessing ? (
            <ProcessingPanel />
          ) : (
            <HeroUpload uploading={uploading} uploadError={uploadError} onFile={handleFile} />
          )}
        </div>
      )}
    </>
  );
}

interface HeroUploadProps {
  uploading: boolean;
  uploadError: string | null;
  onFile: (file: File) => void;
}

function HeroUpload({ uploading, uploadError, onFile }: HeroUploadProps) {
  return (
    <div className="mx-auto max-w-[720px] pt-3">
      <div className="mb-7 text-center">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-teal">
          <HeartPulse className="h-3 w-3" aria-hidden />
          A calm way to read medical reports
        </span>
        <h1 className="h1-underline mx-auto mb-3 font-display text-[clamp(28px,4vw,38px)] font-semibold leading-[1.15] tracking-[-0.02em]">
          Understand your report, <em>in plain words.</em>
        </h1>
        <p className="mx-auto max-w-[460px] text-[16px] leading-relaxed text-muted">
          Upload a PDF or photo. We&apos;ll explain what each value means and answer
          questions about it — in fourteen languages.
        </p>
      </div>

      <UploadZone onFile={onFile} disabled={uploading} />

      {uploadError && (
        <p role="alert" className="mt-4 rounded-md bg-red-soft px-4 py-2.5 text-[13px] text-red">
          {uploadError}
        </p>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        <FeatureCard
          Icon={Languages}
          title="14 languages"
          sub="English, हिन्दी, தமிழ், 中文 and more."
        />
        <FeatureCard Icon={Mic} title="Voice mode" sub="Speak your question, hear the answer." />
        <FeatureCard
          Icon={Sparkles}
          title="Grounded answers"
          sub="The AI only uses what's in your report."
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 rounded-md border border-line bg-surface px-4 py-3.5 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" aria-hidden />
          <strong className="font-semibold text-ink-2">Private by default.</strong>
        </span>
        <span>Reports are encrypted at rest. You can delete them at any time.</span>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  Icon: typeof Sparkles;
  title: string;
  sub: string;
}

function FeatureCard({ Icon, title, sub }: FeatureCardProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface p-3.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-teal-soft text-teal">
        <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold">{title}</div>
        <p className="mt-0.5 text-[12px] leading-tight text-muted">{sub}</p>
      </div>
    </div>
  );
}

interface LoadedViewProps {
  summary: string;
  pageCount: number | null;
  sourceLang: Language;
  summaryStreaming: boolean;
  messages: ReturnType<typeof useReportStore.getState>['messages'];
  chatStreaming: boolean;
  streaming: boolean;
  historyError: string | null;
  onRetryHistory: () => void;
  onSendChat: (question: string, voiceInput?: boolean) => void;
  onTranscribe: (blob: Blob) => Promise<string>;
  onSpeak: (text: string) => Promise<Blob>;
  onClearChat: () => Promise<void>;
  chatOpen: boolean;
  onOpenChat: () => void;
  onCloseChat: () => void;
}

/**
 * Loaded report layout: summary in a scrollable reading column, chat panel as
 * a sticky side rail with its own scroll context + always-visible composer.
 *
 * Desktop (lg+): chat is a 440px right column that can collapse, giving the
 * summary the full reading width. Mobile (< lg): chat becomes a full-screen
 * overlay drawer triggered by the topbar AI chat button.
 */
function LoadedView(props: LoadedViewProps) {
  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <main
        className={cn(
          'flex-1 overflow-y-auto px-8 py-7 transition-[padding] max-sm:px-4 max-sm:py-4',
          // When the chat panel is open on desktop, narrow the reading column
          // so the summary doesn't crash against the right rail.
          props.chatOpen ? 'lg:pr-8' : 'lg:pr-12',
        )}
      >
        <div className={cn('mx-auto space-y-5', props.chatOpen ? 'max-w-[760px]' : 'max-w-[860px]')}>
          {props.historyError && (
            <div
              role="alert"
              className="rounded-md border border-amber-soft bg-amber-soft/40 p-3 text-[13px] text-amber"
            >
              Couldn&apos;t load history: {props.historyError}{' '}
              <button
                type="button"
                className="font-medium underline"
                onClick={props.onRetryHistory}
              >
                Retry
              </button>
            </div>
          )}

          <ReportSummary
            summary={props.summary}
            pageCount={props.pageCount}
            sourceLang={props.sourceLang}
            streaming={props.summaryStreaming}
            onSpeak={props.onSpeak}
          />
        </div>
      </main>

      {/* Chat side panel — desktop static column, mobile full-screen overlay. */}
      <aside
        aria-hidden={!props.chatOpen}
        className={cn(
          'z-40 flex flex-col overflow-hidden bg-surface',
          // Desktop: static side panel with a left border.
          'lg:relative lg:w-[440px] lg:shrink-0 lg:border-l lg:border-line lg:bg-surface',
          // Mobile: full-screen overlay with a slide animation when open.
          'fixed inset-0',
          !props.chatOpen && 'hidden',
        )}
      >
        <ChatPanel
          messages={props.messages}
          onSend={props.onSendChat}
          streaming={props.chatStreaming || props.summaryStreaming}
          onTranscribe={props.onTranscribe}
          onSpeakAssistant={props.onSpeak}
          onClear={props.onClearChat}
          onCollapse={props.onCloseChat}
        />
      </aside>

      {/* Floating "Ask AI" pill when the side panel is collapsed (desktop only —
          mobile uses the topbar button). */}
      {!props.chatOpen && (
        <button
          type="button"
          onClick={props.onOpenChat}
          className="absolute bottom-6 right-6 z-30 hidden items-center gap-2 rounded-full bg-teal px-4 py-2.5 text-[13px] font-medium text-white shadow-lg transition-colors hover:bg-teal-deep lg:inline-flex"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Ask AI
        </button>
      )}

      {/* Tiny floating action button (mobile) to summon the chat when closed.
          Topbar already has the button but it's hidden on max-sm, so this is
          the mobile entry point. */}
      {!props.chatOpen && (
        <button
          type="button"
          onClick={props.onOpenChat}
          aria-label="Open AI chat"
          className="fixed bottom-20 right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-teal text-white shadow-lg lg:hidden"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
        </button>
      )}
      {/* Keep the close button reachable in case the embedded one is hidden by
          a virtual keyboard. */}
      {props.chatOpen && (
        <button
          type="button"
          onClick={props.onCloseChat}
          aria-label="Close chat"
          className="fixed right-3 top-3 z-50 grid h-9 w-9 place-items-center rounded-full bg-ink/80 text-white shadow-lg backdrop-blur lg:hidden"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
