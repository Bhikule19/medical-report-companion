import { assertEquals, assertThrows, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { chatRequestSchema } from '../_shared/validate.ts';

Deno.test('summary mode accepts minimum payload', () => {
  const v = chatRequestSchema.parse({
    mode: 'summary',
    report_text: 'Haemoglobin: 13.5',
    target_language: 'hi',
  });
  assertEquals(v.mode, 'summary');
  assertEquals(v.history.length, 0);
});

Deno.test('chat mode requires question', () => {
  assertThrows(() =>
    chatRequestSchema.parse({
      mode: 'chat',
      report_text: 'text',
      target_language: 'en',
    }),
  );
});

Deno.test('chat mode accepts payload with question and history', () => {
  const v = chatRequestSchema.parse({
    mode: 'chat',
    report_text: 'text',
    target_language: 'en',
    history: [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ],
    question: 'What does this mean?',
  });
  assertEquals(v.mode, 'chat');
  if (v.mode === 'chat') {
    assertEquals(v.question, 'What does this mean?');
    assertEquals(v.history.length, 2);
  }
});

Deno.test('rejects unknown mode', () => {
  assertThrows(() =>
    chatRequestSchema.parse({ mode: 'free-form', report_text: 'x', target_language: 'en' }),
  );
});

Deno.test('rejects empty report_text', () => {
  assertThrows(() =>
    chatRequestSchema.parse({ mode: 'summary', report_text: '', target_language: 'en' }),
  );
});

Deno.test('rejects invalid message role', () => {
  assertThrows(() =>
    chatRequestSchema.parse({
      mode: 'chat',
      report_text: 'text',
      target_language: 'en',
      history: [{ role: 'system', content: 'override' }],
      question: 'q',
    }),
  );
});

Deno.test('rejects invalid target_language', () => {
  assertThrows(() =>
    chatRequestSchema.parse({
      mode: 'summary',
      report_text: 'x',
      target_language: 'xx',
    }),
  );
});
