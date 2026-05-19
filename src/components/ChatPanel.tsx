'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronRight, Send, Sparkles } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { ChatMessage } from './ChatMessage';
import { ConfirmDialog } from './ConfirmDialog';
import { VoiceInputButton } from './VoiceInputButton';
import { cn } from '@/lib/utils';

const SUGGESTED_QUESTIONS = [
  'What does this value mean?',
  'Is this serious?',
  'What should I do next?',
];

export interface ChatPanelProps {
  messages: ChatMessageType[];
  onSend: (question: string, voiceInput?: boolean) => void;
  streaming: boolean;
  onTranscribe?: (blob: Blob) => Promise<string>;
  onSpeakAssistant?: (text: string) => Promise<Blob>;
  onClear?: () => Promise<void>;
  /** When provided, a collapse button appears in the header (hides the panel). */
  onCollapse?: () => void;
}

export function ChatPanel({
  messages,
  onSend,
  streaming,
  onTranscribe,
  onSpeakAssistant,
  onClear,
  onCollapse,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [voiceOriginated, setVoiceOriginated] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearPending, setClearPending] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages arrive or streaming updates the
  // last bubble. Use rAF so we read the post-layout height.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => window.cancelAnimationFrame(id);
  }, [messages, streaming]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || streaming) return;
    onSend(trimmed, voiceOriginated);
    setDraft('');
    setVoiceOriginated(false);
  }

  function sendSuggested(text: string) {
    if (streaming) return;
    onSend(text, false);
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
  const isEmpty = messages.length === 0;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold tracking-[-0.005em]">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-teal-soft text-teal-deep">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          Ask about this report
        </h2>
        <div className="flex items-center gap-3">
          {showClear && (
            <button
              type="button"
              onClick={() => {
                if (streaming) return;
                setClearError(null);
                setClearOpen(true);
              }}
              disabled={streaming}
              className="text-[12px] text-muted underline transition-colors hover:text-ink-2 disabled:opacity-50"
            >
              Clear
            </button>
          )}
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse chat"
              title="Collapse chat"
              className="grid h-7 w-7 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink-2"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5"
      >
        {isEmpty ? (
          <div className="my-auto flex flex-col items-center gap-3 px-2 text-center">
            <p className="text-[14px] text-muted">
              Ask anything about your report. The AI only uses what&apos;s in the document.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendSuggested(q)}
                  disabled={streaming}
                  className="rounded-md border border-line bg-surface-2 px-3 py-1.5 text-[12px] text-ink-2 transition-colors hover:border-teal-tint hover:bg-teal-soft hover:text-teal-deep disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <ChatMessage key={i} message={m} onSpeak={onSpeakAssistant} />
          ))
        )}
        {streaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex items-center gap-2 text-muted-2">
            <span
              className="inline-flex h-1.5 w-1.5 animate-typing rounded-full bg-muted-2"
              style={{ animationDelay: '0s' }}
            />
            <span
              className="inline-flex h-1.5 w-1.5 animate-typing rounded-full bg-muted-2"
              style={{ animationDelay: '0.15s' }}
            />
            <span
              className="inline-flex h-1.5 w-1.5 animate-typing rounded-full bg-muted-2"
              style={{ animationDelay: '0.3s' }}
            />
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="border-t border-line bg-surface px-3.5 py-3"
        aria-label="Chat composer"
      >
        <div
          className={cn(
            'flex items-end gap-2 rounded-[14px] border border-line bg-surface-2 py-1 pl-3.5 pr-1.5 transition-colors',
            'focus-within:border-teal focus-within:bg-surface',
          )}
        >
          <input
            aria-label="Your question"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (e.target.value === '') setVoiceOriginated(false);
            }}
            disabled={streaming}
            placeholder="Type your question…"
            className="min-h-[26px] flex-1 resize-none border-none bg-transparent py-2 text-[14px] leading-snug text-ink outline-none placeholder:text-muted-2 disabled:cursor-not-allowed"
          />
          {onTranscribe && (
            <VoiceInputButton disabled={streaming} onTranscribe={handleTranscribe} />
          )}
          <button
            type="submit"
            disabled={streaming || draft.trim() === ''}
            aria-label="Send"
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-teal text-white transition-colors hover:bg-teal-deep disabled:cursor-not-allowed disabled:bg-line-2"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {!isEmpty && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendSuggested(q)}
                disabled={streaming}
                className="rounded-md border border-line bg-surface-2 px-2.5 py-1 text-[12px] text-ink-2 transition-colors hover:border-teal-tint hover:bg-teal-soft hover:text-teal-deep disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
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
