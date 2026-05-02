import { describe, it, expect } from 'vitest';
import { parseSseStream } from './sse';

function readableFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

describe('parseSseStream', () => {
  it('yields data payloads from well-formed events', async () => {
    const stream = readableFromChunks([
      'data: {"chunk":"hi"}\n\n',
      'data: {"chunk":" there"}\n\n',
      'data: {"done":true}\n\n',
    ]);
    const seen: string[] = [];
    for await (const ev of parseSseStream(stream)) seen.push(JSON.stringify(ev));
    expect(seen).toEqual(['{"chunk":"hi"}', '{"chunk":" there"}', '{"done":true}']);
  });

  it('handles events split across chunks', async () => {
    const stream = readableFromChunks([
      'data: {"chu',
      'nk":"split"}\n',
      '\ndata: {"done":true}\n\n',
    ]);
    const seen: unknown[] = [];
    for await (const ev of parseSseStream(stream)) seen.push(ev);
    expect(seen).toEqual([{ chunk: 'split' }, { done: true }]);
  });

  it('skips comment and unknown lines', async () => {
    const stream = readableFromChunks([':keep-alive\n\n', 'event: x\ndata: {"chunk":"a"}\n\n']);
    const seen: unknown[] = [];
    for await (const ev of parseSseStream(stream)) seen.push(ev);
    expect(seen).toEqual([{ chunk: 'a' }]);
  });
});
