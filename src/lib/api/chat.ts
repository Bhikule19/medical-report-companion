import type { ChatMessage, ChatStreamEvent, Language } from '../types';
import type { SupabaseConfig } from '../env';
import { parseSseStream } from './sse';

interface BaseInput {
  reportText: string;
  language: Language;
  accessToken: string;
  config: SupabaseConfig;
  fetchImpl?: typeof fetch;
}

export type ChatInput =
  | (BaseInput & { mode: 'summary' })
  | (BaseInput & { mode: 'chat'; history: ChatMessage[]; question: string });

export async function* chat(input: ChatInput): AsyncGenerator<ChatStreamEvent> {
  const fetchFn = input.fetchImpl ?? fetch;

  const body =
    input.mode === 'summary'
      ? {
          mode: 'summary' as const,
          report_text: input.reportText,
          target_language: input.language,
          history: [],
        }
      : {
          mode: 'chat' as const,
          report_text: input.reportText,
          target_language: input.language,
          history: input.history,
          question: input.question,
        };

  const res = await fetchFn(`${input.config.url}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      apikey: input.config.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    let message = `chat_failed_${res.status}`;
    try {
      const errBody = await res.json();
      if (typeof errBody?.error === 'string') message = errBody.error;
    } catch {
      // ignore
    }
    yield { kind: 'error', message };
    return;
  }

  for await (const ev of parseSseStream(res.body)) {
    if (typeof ev.chunk === 'string') yield { kind: 'chunk', text: ev.chunk };
    else if (typeof ev.footer === 'string') yield { kind: 'footer', text: ev.footer };
    else if (ev.done === true) yield { kind: 'done' };
    else if (typeof ev.error === 'string') yield { kind: 'error', message: ev.error };
  }
}
