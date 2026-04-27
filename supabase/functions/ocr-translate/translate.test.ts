import { assertStringIncludes, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { translateWithGlossary } from './translate.ts';

Deno.test('preserves medical terms via glossary', async () => {
  const fakeFetch: typeof fetch = async (_, init) => {
    const initBody = (init as { body?: string } | undefined)?.body ?? '';
    const body = JSON.parse(initBody);
    // Echo the input but localised
    const replaced = body.q[0].replace(/is high/g, 'अधिक है');
    return new Response(
      JSON.stringify({ data: { translations: [{ translatedText: replaced }] } }),
      { status: 200 },
    );
  };
  const result = await translateWithGlossary('Creatinine is high', 'en', 'hi', {
    apiKey: 'test',
    fetchImpl: fakeFetch,
  });
  assertStringIncludes(result, 'क्रिएटिनिन');
});

Deno.test('returns original text unchanged when source equals target', async () => {
  // No fetch should be called — assert by passing a fetch that throws
  const fakeFetch: typeof fetch = async () => {
    throw new Error('should not be called');
  };
  const result = await translateWithGlossary('Hello world', 'en', 'en', {
    apiKey: 'test',
    fetchImpl: fakeFetch,
  });
  assertEquals(result, 'Hello world');
});

Deno.test('throws on translate API error', async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 500 });
  let caught: unknown;
  try {
    await translateWithGlossary('text', 'en', 'hi', {
      apiKey: 'test',
      fetchImpl: fakeFetch,
    });
  } catch (e) {
    caught = e;
  }
  assertEquals((caught as Error).message.includes('translate_failed'), true);
});
