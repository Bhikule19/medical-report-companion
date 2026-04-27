import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ocrRequestSchema } from '../_shared/validate.ts';

Deno.test('rejects missing target_language', () => {
  assertThrows(() => ocrRequestSchema.parse({}));
});

Deno.test('accepts valid target_language', () => {
  const v = ocrRequestSchema.parse({ target_language: 'hi' });
  assertEquals(v.target_language, 'hi');
});

Deno.test('rejects invalid language code', () => {
  assertThrows(() => ocrRequestSchema.parse({ target_language: 'xx' }));
});
