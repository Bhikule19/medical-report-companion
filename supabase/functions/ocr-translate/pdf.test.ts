import { assert, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { extractDigitalPdfText, isDigitalPdf, probeDigitalPdf } from './pdf.ts';

Deno.test('extractDigitalPdfText returns text from a digital PDF', async () => {
  const bytes = await Deno.readFile('tests/fixtures/digital-en.pdf');
  const text = await extractDigitalPdfText(bytes);
  assert(text.length > 0);
  assertStringIncludes(text.toLowerCase(), 'haemoglobin');
});

Deno.test('isDigitalPdf returns true for PDFs with extractable text', async () => {
  const bytes = await Deno.readFile('tests/fixtures/digital-en.pdf');
  assert(await isDigitalPdf(bytes));
});

Deno.test('probeDigitalPdf returns text and isDigital flag in one call', async () => {
  const bytes = await Deno.readFile('tests/fixtures/digital-en.pdf');
  const { isDigital, text } = await probeDigitalPdf(bytes);
  assert(isDigital);
  assert(text.length > 50);
});
