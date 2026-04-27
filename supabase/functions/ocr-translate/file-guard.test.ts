import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { validateFile } from './file-guard.ts';

Deno.test('rejects file >10MB', () => {
  const r = validateFile({ size: 11 * 1024 * 1024, type: 'application/pdf' });
  assert(!r.ok);
  assertEquals(r.error, 'file_too_large');
});

Deno.test('rejects unsupported type', () => {
  const r = validateFile({ size: 1000, type: 'text/plain' });
  assert(!r.ok);
  assertEquals(r.error, 'unsupported_type');
});

Deno.test('accepts valid PDF under 10MB', () => {
  const r = validateFile({ size: 5 * 1024 * 1024, type: 'application/pdf' });
  assert(r.ok);
});

Deno.test('accepts JPEG and PNG', () => {
  for (const t of ['image/jpeg', 'image/png']) {
    const r = validateFile({ size: 100_000, type: t });
    assert(r.ok, `should accept ${t}`);
  }
});
