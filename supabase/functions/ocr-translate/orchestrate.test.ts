import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { orchestrate } from './orchestrate.ts';

Deno.test('digital-PDF path returns parsed and translated text', async () => {
  const bytes = await Deno.readFile('tests/fixtures/digital-en.pdf');

  // The translate fetch returns mocked Hindi text on translate calls,
  // and a mock 'en' detection on detect calls.
  const translateFetch: typeof fetch = async (url) => {
    const u = String(url);
    if (u.includes('/detect')) {
      return new Response(
        JSON.stringify({ data: { detections: [[{ language: 'en' }]] } }),
        { status: 200 },
      );
    }
    // Translate path
    return new Response(
      JSON.stringify({
        data: { translations: [{ translatedText: 'अनुवादित पाठ' }] },
      }),
      { status: 200 },
    );
  };

  const result = await orchestrate({
    bytes,
    mimeType: 'application/pdf',
    targetLang: 'hi',
    deps: {
      visionApiKey: 'unused',
      translateApiKey: 'unused',
      visionFetch: async () => new Response('{}', { status: 200 }),
      translateFetch,
    },
  });

  assertEquals(result.source_language, 'en');
  assertEquals(result.target_language, 'hi');
  assert(result.original_text.length > 0);
  assert(result.translated_text.length > 0);
});

Deno.test('image path uses Vision OCR (not pdfjs)', async () => {
  const visionFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        responses: [{ fullTextAnnotation: { text: 'Haemoglobin: 13.5' } }],
      }),
      { status: 200 },
    );

  const translateFetch: typeof fetch = async (url) => {
    const u = String(url);
    if (u.includes('/detect')) {
      return new Response(
        JSON.stringify({ data: { detections: [[{ language: 'en' }]] } }),
        { status: 200 },
      );
    }
    return new Response('{}', { status: 200 });
  };

  // For image input, source==target so translate is skipped — translateFetch.detect path used only
  const result = await orchestrate({
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: 'image/png',
    targetLang: 'en',
    deps: {
      visionApiKey: 'k',
      translateApiKey: 'k',
      visionFetch,
      translateFetch,
    },
  });

  assertEquals(result.source_language, 'en');
  assertEquals(result.target_language, 'en');
  assertEquals(result.original_text, 'Haemoglobin: 13.5');
  assertEquals(result.translated_text, 'Haemoglobin: 13.5'); // no translation when source===target
});

Deno.test('skips translate when source equals target', async () => {
  const bytes = await Deno.readFile('tests/fixtures/digital-en.pdf');

  let translateCalls = 0;
  const translateFetch: typeof fetch = async (url) => {
    const u = String(url);
    if (u.includes('/detect')) {
      return new Response(
        JSON.stringify({ data: { detections: [[{ language: 'en' }]] } }),
        { status: 200 },
      );
    }
    translateCalls++;
    return new Response(
      JSON.stringify({
        data: { translations: [{ translatedText: 'unused' }] },
      }),
      { status: 200 },
    );
  };

  const result = await orchestrate({
    bytes,
    mimeType: 'application/pdf',
    targetLang: 'en',
    deps: {
      visionApiKey: 'k',
      translateApiKey: 'k',
      translateFetch,
    },
  });

  assertEquals(translateCalls, 0); // never hit the translate path
  assertEquals(result.original_text, result.translated_text);
});
