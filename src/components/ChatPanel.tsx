'use client';

import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
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
    <section className="flex h-full flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-headline text-on-surface">Ask a question</h2>
        {showClear && (
          <button
            type="button"
            onClick={() => {
              if (streaming) return;
              setClearError(null);
              setClearOpen(true);
            }}
            disabled={streaming}
            className="text-body-md text-on-surface-variant underline transition-colors hover:text-on-surface disabled:opacity-50"
          >
            Clear chat
          </button>
        )}
      </header>
      <div className="mb-4 flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-body-md text-on-surface-variant">
            Ask anything about your report. The assistant uses only the report contents.
          </p>
        )}
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} onSpeak={onSpeakAssistant} />
        ))}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2">
        {onTranscribe && (
          <VoiceInputButton disabled={streaming} onTranscribe={handleTranscribe} />
        )}
        <input
          aria-label="Your question"
          className="flex-1 rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface transition-colors hover:border-outline focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:bg-surface-container-low disabled:text-on-surface-variant"
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
          className="inline-flex items-center gap-2 rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary transition-all hover:-translate-y-px hover:bg-primary hover:shadow-card disabled:translate-y-0 disabled:bg-on-surface-variant disabled:opacity-60 disabled:shadow-none"
        >
          <span>Send</span>
          <Send className="h-4 w-4" aria-hidden />
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
