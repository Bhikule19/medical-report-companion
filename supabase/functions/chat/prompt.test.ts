import { assertEquals, assertStringIncludes, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildSummaryPrompt, buildChatPrompt } from './prompt.ts';

const REPORT = 'Haemoglobin: 13.5 g/dL\nCreatinine: 0.9 mg/dL';

Deno.test('summary prompt: returns 2 messages (system + user)', () => {
  const msgs = buildSummaryPrompt('en', REPORT);
  assertEquals(msgs.length, 2);
  assertEquals(msgs[0].role, 'system');
  assertEquals(msgs[1].role, 'user');
});

Deno.test('summary prompt: system contains all safety rules', () => {
  const msgs = buildSummaryPrompt('en', REPORT);
  const sys = msgs[0].content;
  assertStringIncludes(sys, 'do NOT diagnose');
  assertStringIncludes(sys, 'do NOT prescribe');
  assertStringIncludes(sys, 'consult their doctor');
  assertStringIncludes(sys, 'qualified healthcare provider');
  assertStringIncludes(sys, 'Do NOT make up values');
});

Deno.test('summary prompt: system contains report text', () => {
  const msgs = buildSummaryPrompt('en', REPORT);
  assertStringIncludes(msgs[0].content, 'Haemoglobin: 13.5 g/dL');
});

Deno.test('summary prompt: user message asks for plain-language summary with up to 3 highlights', () => {
  const msgs = buildSummaryPrompt('en', REPORT);
  assertStringIncludes(msgs[1].content, 'plain-language summary');
  assertStringIncludes(msgs[1].content, '3');
});

Deno.test('summary prompt: language directive matches target lang', () => {
  for (const [lang, expected] of [
    ['en', 'Respond in English'],
    ['hi', 'Respond in Hindi'],
    ['ta', 'Respond in Tamil'],
    ['te', 'Respond in Telugu'],
    ['bn', 'Respond in Bengali'],
    ['mr', 'Respond in Marathi'],
  ] as const) {
    const msgs = buildSummaryPrompt(lang, REPORT);
    assertStringIncludes(msgs[0].content, expected);
  }
});

Deno.test('summary prompt: non-English directives include must-be-in clause', () => {
  for (const lang of ['hi', 'ta', 'te', 'bn', 'mr'] as const) {
    const msgs = buildSummaryPrompt(lang, REPORT);
    assertStringIncludes(msgs[0].content, 'must be in');
  }
});

Deno.test('chat prompt: with empty history returns [system, user]', () => {
  const msgs = buildChatPrompt('en', REPORT, [], 'What is my haemoglobin?');
  assertEquals(msgs.length, 2);
  assertEquals(msgs[0].role, 'system');
  assertEquals(msgs[1].role, 'user');
  assertEquals(msgs[1].content, 'What is my haemoglobin?');
});

Deno.test('chat prompt: with history preserves user/assistant pairs in order', () => {
  const history = [
    { role: 'user' as const, content: 'Earlier question' },
    { role: 'assistant' as const, content: 'Earlier answer' },
  ];
  const msgs = buildChatPrompt('en', REPORT, history, 'New question');
  assertEquals(msgs.length, 4); // system + 2 history + new user
  assertEquals(msgs[0].role, 'system');
  assertEquals(msgs[1].role, 'user');
  assertEquals(msgs[1].content, 'Earlier question');
  assertEquals(msgs[2].role, 'assistant');
  assertEquals(msgs[2].content, 'Earlier answer');
  assertEquals(msgs[3].role, 'user');
  assertEquals(msgs[3].content, 'New question');
});

Deno.test('chat prompt: system contains chat-specific rule about using only report info', () => {
  const msgs = buildChatPrompt('en', REPORT, [], 'q');
  assertStringIncludes(msgs[0].content, 'ONLY information from the report');
});

Deno.test('chat prompt: system contains all the same safety rules as summary', () => {
  const msgs = buildChatPrompt('en', REPORT, [], 'q');
  const sys = msgs[0].content;
  assertStringIncludes(sys, 'do NOT diagnose');
  assertStringIncludes(sys, 'do NOT prescribe');
  assertStringIncludes(sys, 'stopping, starting, or changing any medication');
  assertStringIncludes(sys, 'qualified healthcare provider');
});

Deno.test('chat prompt: system contains report text', () => {
  const msgs = buildChatPrompt('en', REPORT, [], 'q');
  assertStringIncludes(msgs[0].content, 'Creatinine: 0.9 mg/dL');
});

Deno.test('messages have only role + content fields (OpenAI/Groq compatible)', () => {
  const summary = buildSummaryPrompt('hi', REPORT);
  const chat = buildChatPrompt('hi', REPORT, [], 'q');
  for (const m of [...summary, ...chat]) {
    const keys = Object.keys(m).sort();
    assertEquals(keys, ['content', 'role']);
  }
  assert(true);
});
