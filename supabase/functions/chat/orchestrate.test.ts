import { assertEquals, assertStringIncludes, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleChatRequest } from './orchestrate.ts';
import type { ChatRequest } from '../_shared/validate.ts';

function sseResponse(chunks: string[]): Response {
  const body = chunks
    .map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`)
    .concat(['data: [DONE]\n\n'])
    .join('');
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

async function readSseEvents(response: Response): Promise<Array<Record<string, unknown>>> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const events: Array<Record<string, unknown>> = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const line = block.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      try {
        events.push(JSON.parse(line.slice(6)));
      } catch {
        // skip
      }
    }
  }
  return events;
}

Deno.test('summary mode streams chunks then done', async () => {
  const fakeFetch: typeof fetch = async () => sseResponse(['Hello', ' world']);
  const req: ChatRequest = {
    mode: 'summary',
    report_text: 'Haemoglobin: 13.5',
    target_language: 'en',
    history: [],
  };
  const res = await handleChatRequest(req, { groqApiKey: 'k', fetchImpl: fakeFetch });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('Content-Type'), 'text/event-stream');
  const events = await readSseEvents(res);
  assertEquals(events[0], { chunk: 'Hello' });
  assertEquals(events[1], { chunk: ' world' });
  // Last event is done
  assertEquals(events[events.length - 1], { done: true });
});

Deno.test('chat mode includes user question in prompt path', async () => {
  let sentBody: string | undefined;
  const fakeFetch: typeof fetch = async (_, init) => {
    const initAny = init as { body?: string };
    sentBody = initAny.body;
    return sseResponse(['answer']);
  };
  const req: ChatRequest = {
    mode: 'chat',
    report_text: 'r',
    target_language: 'en',
    history: [],
    question: 'What is haemoglobin?',
  };
  const res = await handleChatRequest(req, { groqApiKey: 'k', fetchImpl: fakeFetch });
  await readSseEvents(res); // drain
  const parsed = JSON.parse(sentBody!);
  // Find the user message containing the question
  const userMsg = parsed.messages.find(
    (m: { role: string; content: string }) => m.role === 'user' && m.content === 'What is haemoglobin?',
  );
  assert(userMsg, 'expected the question to appear as a user message');
});

Deno.test('emits footer event when prescription pattern matched', async () => {
  const fakeFetch: typeof fetch = async () => sseResponse(['You should take 500 mg of metformin.']);
  const req: ChatRequest = {
    mode: 'summary',
    report_text: 'r',
    target_language: 'en',
    history: [],
  };
  const res = await handleChatRequest(req, { groqApiKey: 'k', fetchImpl: fakeFetch });
  const events = await readSseEvents(res);
  const footerEvent = events.find((e) => 'footer' in e);
  assert(footerEvent, 'expected a footer event');
  const f = footerEvent.footer;
  assert(typeof f === 'string' && f.includes('⚠'), 'footer should include warning glyph');
});

Deno.test('does not emit footer for safe content', async () => {
  const fakeFetch: typeof fetch = async () =>
    sseResponse(['Your haemoglobin is normal at 13.5 g/dL. ', 'Discuss with your doctor.']);
  const req: ChatRequest = {
    mode: 'summary',
    report_text: 'r',
    target_language: 'en',
    history: [],
  };
  const res = await handleChatRequest(req, { groqApiKey: 'k', fetchImpl: fakeFetch });
  const events = await readSseEvents(res);
  const footerEvent = events.find((e) => 'footer' in e);
  assertEquals(footerEvent, undefined);
});

Deno.test('emits error event when Groq fails on both attempts', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'down' } }), { status: 503 });
  const req: ChatRequest = {
    mode: 'summary',
    report_text: 'r',
    target_language: 'en',
    history: [],
  };
  const res = await handleChatRequest(req, { groqApiKey: 'k', fetchImpl: fakeFetch });
  // The orchestrator should still return 200 with an error event in the SSE stream
  // OR return a non-200 — let's assert based on what the implementation does.
  // For our design: pre-stream errors throw, post-stream errors send error events.
  // groq_failed throws BEFORE we open the SSE stream — so this should be a 502 JSON response.
  assertEquals(res.status, 502);
  const body = await res.json();
  assertStringIncludes(body.error, 'groq_failed');
});

Deno.test('localises footer per target_language', async () => {
  const fakeFetch: typeof fetch = async () => sseResponse(['Take 500 mg daily.']);
  const req: ChatRequest = {
    mode: 'summary',
    report_text: 'r',
    target_language: 'hi',
    history: [],
  };
  const res = await handleChatRequest(req, { groqApiKey: 'k', fetchImpl: fakeFetch });
  const events = await readSseEvents(res);
  const footerEvent = events.find((e) => 'footer' in e);
  const f = (footerEvent as { footer: string }).footer;
  assertStringIncludes(f, 'योग्य'); // Hindi marker
});
