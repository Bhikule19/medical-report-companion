'use client';

import { useState } from 'react';
import { LanguagePicker } from '@/components/LanguagePicker';
import { UploadZone } from '@/components/UploadZone';
import { ReportSummary } from '@/components/ReportSummary';
import { ChatPanel } from '@/components/ChatPanel';
import { useReportStore } from '@/store/useReportStore';
import { ocrTranslate, OcrError } from '@/lib/api/ocrTranslate';
import { chat } from '@/lib/api/chat';
import { getSupabaseConfig } from '@/lib/env';
import type { Language } from '@/lib/types';

const config = getSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export default function Page() {
  const language = useReportStore((s) => s.language);
  const report = useReportStore((s) => s.report);
  const summary = useReportStore((s) => s.summary);
  const summaryStreaming = useReportStore((s) => s.summaryStreaming);
  const messages = useReportStore((s) => s.messages);
  const chatStreaming = useReportStore((s) => s.chatStreaming);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const result = await ocrTranslate({ file, targetLang: language, config });
      useReportStore.getState().setReport({
        originalText: result.original_text,
        pageCount: result.page_count,
        sourceLang: result.source_language as Language,
      });
      await streamSummary(result.original_text, language);
    } catch (e) {
      if (e instanceof OcrError && e.status === 429 && e.retryAfterSeconds) {
        setUploadError(`Too many requests. Try again in ${e.retryAfterSeconds}s.`);
      } else {
        setUploadError(e instanceof Error ? e.message : 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  }

  async function streamSummary(reportText: string, lang: Language) {
    const store = useReportStore.getState();
    store.setSummaryStreaming(true);
    try {
      for await (const ev of chat({ mode: 'summary', reportText, language: lang, config })) {
        if (ev.kind === 'chunk') store.appendSummary(ev.text);
        else if (ev.kind === 'footer') store.appendSummary(`\n\n${ev.text}`);
        else if (ev.kind === 'error') store.appendSummary(`\n\n(error: ${ev.message})`);
      }
    } finally {
      useReportStore.getState().setSummaryStreaming(false);
    }
  }

  async function handleSendChat(question: string) {
    if (!report) return;
    const store = useReportStore.getState();
    const history = store.messages;
    store.appendUserMessage(question);
    store.setChatStreaming(true);
    try {
      for await (const ev of chat({
        mode: 'chat',
        reportText: report.originalText,
        language,
        history,
        question,
        config,
      })) {
        if (ev.kind === 'chunk') store.appendAssistantChunk(ev.text);
        else if (ev.kind === 'footer') store.appendAssistantChunk(`\n\n${ev.text}`);
        else if (ev.kind === 'error') store.appendAssistantChunk(`\n\n(error: ${ev.message})`);
      }
    } finally {
      useReportStore.getState().setChatStreaming(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Medical Report Companion</h1>
        <LanguagePicker />
      </header>

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
          />
          <ChatPanel
            messages={messages}
            onSend={handleSendChat}
            streaming={chatStreaming || summaryStreaming}
          />
        </div>
      )}
    </main>
  );
}
