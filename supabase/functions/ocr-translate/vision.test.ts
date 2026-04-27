import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ocrViaVision } from './vision.ts';

Deno.test('parses Vision DOCUMENT_TEXT_DETECTION response', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        responses: [{ fullTextAnnotation: { text: 'Haemoglobin: 13.5 g/dL' } }],
      }),
      { status: 200 },
    );
  const text = await ocrViaVision(new Uint8Array([1, 2, 3]), 'image/png', {
    apiKey: 'test',
    fetchImpl: fakeFetch,
  });
  assertEquals(text, 'Haemoglobin: 13.5 g/dL');
});

Deno.test('throws on Vision error response', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'quota' } }), { status: 429 });
  let caught: unknown;
  try {
    await ocrViaVision(new Uint8Array([1]), 'image/png', {
      apiKey: 'test',
      fetchImpl: fakeFetch,
    });
  } catch (e) {
    caught = e;
  }
  assertEquals((caught as Error).message.includes('vision_failed'), true);
});

Deno.test('returns empty string when Vision response has no fullTextAnnotation', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ responses: [{}] }), { status: 200 });
  const text = await ocrViaVision(new Uint8Array([1]), 'image/png', {
    apiKey: 'test',
    fetchImpl: fakeFetch,
  });
  assertEquals(text, '');
});
