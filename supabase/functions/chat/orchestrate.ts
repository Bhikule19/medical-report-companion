import type { ChatRequest } from '../_shared/validate.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { buildSummaryPrompt, buildChatPrompt } from './prompt.ts';
import { trimHistory } from './trim.ts';
import { callGroqStream, type LlmDeps } from './llm.ts';
import { containsPrescriptionPattern, getSafetyFooter } from './safety.ts';

export interface ChatHandlerDeps {
  groqApiKey: string;
  fetchImpl?: typeof fetch;
}

export async function handleChatRequest(
  req: ChatRequest,
  deps: ChatHandlerDeps,
): Promise<Response> {
  const messages =
    req.mode === 'summary'
      ? buildSummaryPrompt(req.target_language, req.report_text)
      : buildChatPrompt(
          req.target_language,
          req.report_text,
          trimHistory({ reportText: req.report_text, history: req.history }),
          req.question,
        );

  const llmDeps: LlmDeps = {
    apiKey: deps.groqApiKey,
    fetchImpl: deps.fetchImpl,
  };

  let textStream: ReadableStream<string>;
  try {
    textStream = await callGroqStream(messages, llmDeps);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const lang = req.target_language;
  const sseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let accumulated = '';

      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const reader = textStream.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          accumulated += value;
          send({ chunk: value });
        }
        if (containsPrescriptionPattern(accumulated)) {
          send({ footer: getSafetyFooter(lang) });
        }
        send({ done: true });
      } catch (e) {
        send({ error: (e as Error).message });
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
    cancel() {
      // Consumer aborted; nothing to clean up beyond what `start` does
    },
  });

  return new Response(sseStream, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
