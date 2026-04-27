import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { callGroqStream } from './llm.ts';
import type { LlmMessage } from './prompt.ts';

const MSGS: LlmMessage[] = [
  { role: 'system', content: 'You are a helper.' },
  { role: 'user', content: 'Say hello' },
];

function sseResponse(chunks: string[]): Response {
  // Build a single SSE body from the chunk list, then [DONE].
  const body = chunks
    .map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`)
    .concat(['data: [DONE]\n\n'])
    .join('');
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

async function collectStream(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let out = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += value;
  }
  return out;
}

Deno.test('parses SSE stream into concatenated text', async () => {
  const fakeFetch: typeof fetch = async () => sseResponse(['Hello', ' ', 'world']);
  const stream = await callGroqStream(MSGS, { apiKey: 'k', fetchImpl: fakeFetch });
  assertEquals(await collectStream(stream), 'Hello world');
});

Deno.test('handles [DONE] terminator gracefully', async () => {
  const fakeFetch: typeof fetch = async () => sseResponse(['One', ' two']);
  const stream = await callGroqStream(MSGS, { apiKey: 'k', fetchImpl: fakeFetch });
  assertEquals(await collectStream(stream), 'One two');
});

Deno.test('skips lines without content (e.g., role-only first chunk)', async () => {
  const body = [
    'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
    'data: [DONE]\n\n',
  ].join('');
  const fakeFetch: typeof fetch = async () =>
    new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  const stream = await callGroqStream(MSGS, { apiKey: 'k', fetchImpl: fakeFetch });
  assertEquals(await collectStream(stream), 'Hi');
});

Deno.test('handles SSE chunks split across read() boundaries', async () => {
  // Build a body and split at an awkward byte boundary
  const body = [
    'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
    'data: [DONE]\n\n',
  ].join('');
  // Split into 3 random byte slices
  const enc = new TextEncoder();
  const bytes = enc.encode(body);
  const slices = [bytes.slice(0, 25), bytes.slice(25, 60), bytes.slice(60)];
  const rs = new ReadableStream<Uint8Array>({
    start(c) {
      for (const s of slices) c.enqueue(s);
      c.close();
    },
  });
  const fakeFetch: typeof fetch = async () =>
    new Response(rs, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  const stream = await callGroqStream(MSGS, { apiKey: 'k', fetchImpl: fakeFetch });
  assertEquals(await collectStream(stream), 'Hello');
});

Deno.test('falls back to secondary model when primary returns non-OK', async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async (_, init) => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ error: { message: 'primary down' } }), {
        status: 503,
      });
    }
    // Verify the request body uses the fallback model on retry
    const initAny = init as { body?: string };
    const body = JSON.parse(initAny.body ?? '{}');
    assertEquals(body.model, 'fallback-model');
    return sseResponse(['from-fallback']);
  };
  const stream = await callGroqStream(MSGS, {
    apiKey: 'k',
    fetchImpl: fakeFetch,
    primaryModel: 'primary-model',
    fallbackModel: 'fallback-model',
  });
  assertEquals(await collectStream(stream), 'from-fallback');
  assertEquals(calls, 2);
});

Deno.test('throws groq_failed when both models fail', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'down' } }), { status: 503 });
  let caught: unknown;
  try {
    await callGroqStream(MSGS, { apiKey: 'k', fetchImpl: fakeFetch });
  } catch (e) {
    caught = e;
  }
  assertStringIncludes((caught as Error).message, 'groq_failed');
});

Deno.test('throws groq_failed when fetch itself throws on both attempts', async () => {
  const fakeFetch: typeof fetch = async () => {
    throw new Error('network');
  };
  let caught: unknown;
  try {
    await callGroqStream(MSGS, { apiKey: 'k', fetchImpl: fakeFetch });
  } catch (e) {
    caught = e;
  }
  assertStringIncludes((caught as Error).message, 'groq_failed');
});

Deno.test('uses default models when not specified', async () => {
  const calls: string[] = [];
  const fakeFetch: typeof fetch = async (_, init) => {
    const initAny = init as { body?: string };
    const body = JSON.parse(initAny.body ?? '{}');
    calls.push(body.model);
    return sseResponse(['ok']);
  };
  await callGroqStream(MSGS, { apiKey: 'k', fetchImpl: fakeFetch });
  assertEquals(calls[0], 'llama-3.3-70b-versatile');
});

Deno.test('sends Authorization header', async () => {
  let authHeader: string | null = null;
  const fakeFetch: typeof fetch = async (_, init) => {
    const initAny = init as { headers?: Record<string, string> };
    authHeader = initAny.headers?.['Authorization'] ?? null;
    return sseResponse(['ok']);
  };
  await callGroqStream(MSGS, { apiKey: 'super-secret', fetchImpl: fakeFetch });
  assertEquals(authHeader, 'Bearer super-secret');
});

Deno.test('skips malformed JSON lines without crashing', async () => {
  const body = [
    'data: {not valid json}\n\n',
    'data: {"choices":[{"delta":{"content":"recovered"}}]}\n\n',
    'data: [DONE]\n\n',
  ].join('');
  const fakeFetch: typeof fetch = async () =>
    new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  const stream = await callGroqStream(MSGS, { apiKey: 'k', fetchImpl: fakeFetch });
  assertEquals(await collectStream(stream), 'recovered');
});
