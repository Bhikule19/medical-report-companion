import type { LlmMessage } from './prompt.ts';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_PRIMARY = 'llama-3.3-70b-versatile';
const DEFAULT_FALLBACK = 'openai/gpt-oss-120b';

export interface LlmDeps {
  apiKey: string;
  fetchImpl?: typeof fetch;
  primaryModel?: string;
  fallbackModel?: string;
}

async function attemptCall(
  model: string,
  messages: LlmMessage[],
  deps: LlmDeps,
): Promise<Response> {
  const f = deps.fetchImpl ?? fetch;
  return f(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deps.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });
}

export async function callGroqStream(
  messages: LlmMessage[],
  deps: LlmDeps,
): Promise<ReadableStream<string>> {
  const primary = deps.primaryModel ?? DEFAULT_PRIMARY;
  const fallback = deps.fallbackModel ?? DEFAULT_FALLBACK;

  let res: Response;
  let lastError = '';
  try {
    res = await attemptCall(primary, messages, deps);
    if (!res.ok) {
      lastError = `primary status ${res.status}`;
      res = await attemptCall(fallback, messages, deps);
    }
  } catch (e) {
    lastError = `primary threw: ${(e as Error).message}`;
    try {
      res = await attemptCall(fallback, messages, deps);
    } catch (e2) {
      throw new Error(`groq_failed: ${lastError}; fallback threw: ${(e2 as Error).message}`);
    }
  }

  if (!res.ok) {
    throw new Error(`groq_failed: ${lastError}; fallback status ${res.status}`);
  }

  if (!res.body) {
    throw new Error('groq_failed: empty response body');
  }

  return parseSseToTextStream(res.body);
}

function parseSseToTextStream(body: ReadableStream<Uint8Array>): ReadableStream<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;

  return new ReadableStream<string>({
    async pull(controller) {
      if (done) {
        controller.close();
        return;
      }

      const { value, done: streamDone } = await reader.read();
      if (streamDone) {
        done = true;
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      // Split on SSE event boundary; keep partial trailing event in buffer
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            done = true;
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const content: unknown = json?.choices?.[0]?.delta?.content;
            if (typeof content === 'string' && content.length > 0) {
              controller.enqueue(content);
            }
          } catch {
            // skip malformed line
          }
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}
