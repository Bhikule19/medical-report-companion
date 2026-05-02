'use client';

import { useState, type FormEvent } from 'react';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { ChatMessage } from './ChatMessage';
import { ConfirmDialog } from './ConfirmDialog';
import { VoiceInputButton } from './VoiceInputButton';

export interface ChatPanelProps {
  messages: ChatMessageType[];
  onSend: (question: string, voiceInput?: boolean) => void;
  streaming: boolean;
  onTranscribe?: (blob: Blob) => Promise<string>;
  onSpeakAssistant?: (text: string) => Promise<Blob>;
  onClear?: () => Promise<void>;
}

export function ChatPanel({
  messages,
  onSend,
  streaming,
  onTranscribe,
  onSpeakAssistant,
  onClear,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [voiceOriginated, setVoiceOriginated] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearPending, setClearPending] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || streaming) return;
    onSend(trimmed, voiceOriginated);
    setDraft('');
    setVoiceOriginated(false);
  }

  async function handleTranscribe(blob: Blob) {
    if (!onTranscribe) return;
    try {
      const transcript = await onTranscribe(blob);
      if (transcript.trim().length > 0) {
        setDraft(transcript);
        setVoiceOriginated(true);
      }
    } catch (e) {
      console.error('transcribe_failed', (e as Error).message);
    }
  }

  async function handleConfirmClear() {
    if (!onClear) return;
    setClearPending(true);
    setClearError(null);
    try {
      await onClear();
      setClearOpen(false);
    } catch (e) {
      setClearError((e as Error).message);
    } finally {
      setClearPending(false);
    }
  }

  const showClear = !!onClear && messages.length > 0;

  return (
    <section className="flex h-full flex-col rounded-lg bg-white p-6 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-800">Ask a question</h2>
        {showClear && (
          <button
            type="button"
            onClick={() => {
              if (streaming) return;
              setClearError(null);
              setClearOpen(true);
            }}
            disabled={streaming}
            className="text-sm text-slate-600 underline hover:text-slate-900 disabled:opacity-50"
          >
            Clear chat
          </button>
        )}
      </header>
      <div className="mb-4 flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Ask anything about your report. The assistant uses only the report contents.
          </p>
        )}
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} onSpeak={onSpeakAssistant} />
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        {onTranscribe && (
          <VoiceInputButton disabled={streaming} onTranscribe={handleTranscribe} />
        )}
        <input
          aria-label="Your question"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-base focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value === '') setVoiceOriginated(false);
          }}
          disabled={streaming}
          placeholder="Type your question…"
        />
        <button
          type="submit"
          disabled={streaming || draft.trim() === ''}
          className="rounded-md bg-slate-800 px-4 py-2 text-base font-medium text-white disabled:bg-slate-400"
        >
          Send
        </button>
      </form>

      <ConfirmDialog
        open={clearOpen}
        title="Clear this conversation?"
        body="Your summary stays. Questions and replies will be permanently removed. This cannot be undone."
        confirmLabel="Clear chat"
        confirmTone="danger"
        pending={clearPending}
        error={clearError}
        onConfirm={handleConfirmClear}
        onCancel={() => {
          if (clearPending) return;
          setClearOpen(false);
          setClearError(null);
        }}
      />
    </section>
  );
}
