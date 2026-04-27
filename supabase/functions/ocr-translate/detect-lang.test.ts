import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { detectLanguage } from './detect-lang.ts';

Deno.test('detects English from Google Translate detect endpoint', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ data: { detections: [[{ language: 'en' }]] } }), {
      status: 200,
    });
  const lang = await detectLanguage('Haemoglobin is normal', {
    apiKey: 'test',
    fetchImpl: fakeFetch,
  });
  assertEquals(lang, 'en');
});

Deno.test('detects Hindi', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ data: { detections: [[{ language: 'hi' }]] } }), {
      status: 200,
    });
  const lang = await detectLanguage('हीमोग्लोबिन सामान्य है', {
    apiKey: 'test',
    fetchImpl: fakeFetch,
  });
  assertEquals(lang, 'hi');
});

Deno.test('falls back to en when detection returns unsupported language', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ data: { detections: [[{ language: 'xx' }]] } }), {
      status: 200,
    });
  const lang = await detectLanguage('text', { apiKey: 'test', fetchImpl: fakeFetch });
  assertEquals(lang, 'en');
});

Deno.test('falls back to en on API error', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 500 });
  const lang = await detectLanguage('text', { apiKey: 'test', fetchImpl: fakeFetch });
  assertEquals(lang, 'en');
});

Deno.test('falls back to en on malformed response', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ unexpected: 'shape' }), { status: 200 });
  const lang = await detectLanguage('text', { apiKey: 'test', fetchImpl: fakeFetch });
  assertEquals(lang, 'en');
});
