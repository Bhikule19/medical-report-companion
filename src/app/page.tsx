'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LanguagePicker } from '@/components/LanguagePicker';
import { UploadZone } from '@/components/UploadZone';
import { ReportSummary } from '@/components/ReportSummary';
import { ChatPanel } from '@/components/ChatPanel';
import { AuthGate } from '@/components/AuthGate';
import { ConsentGate } from '@/components/ConsentGate';
import { Footer } from '@/components/Footer';
import { UserMenu } from '@/components/UserMenu';
import { HistorySidebar } from '@/components/HistorySidebar';
import { useReportStore } from '@/store/useReportStore';
import { ocrTranslate, OcrError } from '@/lib/api/ocrTranslate';
import { chat } from '@/lib/api/chat';
import { transcribeAudio, synthesizeSpeech } from '@/lib/api/voice';
import { getSupabaseConfig } from '@/lib/env';
import { useSession } from '@/lib/auth/useSession';
import { getBrowserSupabase } from '@/lib/supabase/browserClient';
import { createReport, deleteReport, getReport, listReports } from '@/lib/db/reports';
import { createMessage, listMessagesForReport } from '@/lib/db/messages';
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

function HomeContent() {
  const router = useRouter();
  const { session } = useSession();
  const supabase = getBrowserSupabase();

  const language = useReportStore((s) => s.language);
  const report = useReportStore((s) => s.report);
  const summary = useReportStore((s) => s.summary);
  const summaryStreaming = useReportStore((s) => s.summaryStreaming);
  const messages = useReportStore((s) => s.messages);
  const chatStreaming = useReportStore((s) => s.chatStreaming);
  const historyList = useReportStore((s) => s.historyList);
  const consents = useReportStore((s) => s.consents);
  const setConsents = useReportStore((s) => s.setConsents);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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
    // Reset the summary before streaming so re-translation replaces (not appends).
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
    // Voice-originated user messages persist only when both store_chat AND
    // store_voice_transcripts are on. Typed messages persist when store_chat is on.
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

  async function handleDeleteReport(id: string) {
    if (!session) return;
    await deleteReport(supabase, id);
    if (report?.id === id) {
      useReportStore.getState().clearReport();
    }
    await refreshHistory(session.user.id);
  }

  async function handleSelectHistory(id: string) {
    if (!session) return;
    try {
      const [row, msgs] = await Promise.all([
        getReport(supabase, id),
        listMessagesForReport(supabase, id),
      ]);
      // Reset the global language picker to the report's persisted target
      // language so the UI matches what is on screen.
      useReportStore.getState().setLanguage(row.target_lang as Language);
      useReportStore.getState().loadReport(
        {
          id: row.id,
          originalText: row.extracted_text,
          pageCount: row.page_count,
          sourceLang: (row.source_lang ?? row.target_lang) as Language,
        },
        msgs.map((m) => ({ role: m.role, content: m.content })),
      );
    } catch (e) {
      console.error('load_report_failed', (e as Error).message);
    }
  }

  async function handleLanguageChange(nextLang: Language) {
    // When a report is loaded, changing the language re-streams the summary
    // in the new language. The persisted summary in the DB is unchanged;
    // re-translation is session-only.
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

  const streaming = summaryStreaming || chatStreaming || uploading;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Medical Report Companion</h1>
        <div className="flex flex-wrap items-center gap-4">
          <LanguagePicker
            onChange={handleLanguageChange}
            disabled={summaryStreaming || chatStreaming}
          />
          <Link href="/nearby" className="text-sm text-slate-600 underline">
            Find nearby
          </Link>
          <Link href="/settings" className="text-sm text-slate-600 underline">
            Settings
          </Link>
          {session?.user?.email && <UserMenu email={session.user.email} />}
        </div>
      </header>

      {historyError && (
        <div role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Couldn&apos;t load history: {historyError}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => session?.user?.id && refreshHistory(session.user.id)}
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <HistorySidebar
          items={historyList}
          activeId={report?.id ?? null}
          onSelect={handleSelectHistory}
          onNew={() => useReportStore.getState().clearReport()}
          onDelete={handleDeleteReport}
          disabled={streaming}
        />

        <div className="flex flex-col gap-6">
          {!report && <UploadZone onFile={handleFile} disabled={uploading} />}
          {uploading && <p className="text-sm text-slate-600">Reading your report…</p>}
          {uploadError && (
            <div role="alert" className="rounded-md bg-red-50 p-4 text-red-800">
              {uploadError}
            </div>
          )}
          {report && (
            <div className="grid gap-6 lg:grid-cols-2">
              <ReportSummary
                summary={summary}
                pageCount={report.pageCount}
                sourceLang={report.sourceLang}
                streaming={summaryStreaming}
                onSpeak={handleSpeak}
              />
              <ChatPanel
                messages={messages}
                onSend={handleSendChat}
                streaming={chatStreaming || summaryStreaming}
                onTranscribe={handleTranscribe}
                onSpeakAssistant={handleSpeak}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <ConsentGate>
        <HomeContent />
        <Footer />
      </ConsentGate>
    </AuthGate>
  );
}
