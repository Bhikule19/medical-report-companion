import { describe, it, expect, vi } from 'vitest';
import { chat } from './chat';

const config = { url: 'https://x.supabase.co', anonKey: 'anon' };

function sseResponse(events: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const e of events) c.enqueue(encoder.encode(e));
      c.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('chat (summary mode)', () => {
  it('emits chunk and done events from SSE', async () => {
    const fetchImpl = vi.fn(async () =>
      sseResponse([
        'data: {"chunk":"Hello "}\n\n',
        'data: {"chunk":"world"}\n\n',
        'data: {"done":true}\n\n',
      ]),
    );

    const events = [];
    for await (const ev of chat({
      mode: 'summary',
      reportText: 'r',
      language: 'hi',
      accessToken: 'user-jwt',
      config,
      fetchImpl,
    })) {
      events.push(ev);
    }

    expect(events).toEqual([
      { kind: 'chunk', text: 'Hello ' },
      { kind: 'chunk', text: 'world' },
      { kind: 'done' },
    ]);

    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      mode: 'summary',
      report_text: 'r',
      target_language: 'hi',
    });
    expect(body.history).toEqual([]);
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer user-jwt');
    expect(headers.get('apikey')).toBe('anon');
  });

  it('emits footer event before done', async () => {
    const fetchImpl = vi.fn(async () =>
      sseResponse([
        'data: {"chunk":"reply"}\n\n',
        'data: {"footer":"Consult your doctor"}\n\n',
        'data: {"done":true}\n\n',
      ]),
    );
    const events = [];
    for await (const ev of chat({
      mode: 'chat',
      reportText: 'r',
      language: 'hi',
      accessToken: 'user-jwt',
      history: [],
      question: 'why?',
      config,
      fetchImpl,
    })) {
      events.push(ev);
    }
    expect(events).toContainEqual({ kind: 'footer', text: 'Consult your doctor' });
  });

  it('emits error event on non-2xx', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'upstream_failed' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const events = [];
    for await (const ev of chat({
      mode: 'summary',
      reportText: 'r',
      language: 'hi',
      accessToken: 'user-jwt',
      config,
      fetchImpl,
    })) {
      events.push(ev);
    }
    expect(events).toEqual([{ kind: 'error', message: 'upstream_failed' }]);
  });
});
