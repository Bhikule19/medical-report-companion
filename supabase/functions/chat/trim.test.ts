import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { trimHistory, DEFAULT_MAX_TOKENS } from './trim.ts';
import type { ChatMessage } from '../_shared/validate.ts';

const pair = (q: string, a: string): ChatMessage[] => [
  { role: 'user', content: q },
  { role: 'assistant', content: a },
];

Deno.test('empty history returns empty', () => {
  assertEquals(
    trimHistory({ reportText: 'short report', history: [] }),
    [],
  );
});

Deno.test('short history under budget returns unchanged', () => {
  const history = [...pair('q1', 'a1'), ...pair('q2', 'a2')];
  const result = trimHistory({ reportText: 'short report', history });
  assertEquals(result.length, 4);
  assertEquals(result[0].content, 'q1');
  assertEquals(result[3].content, 'a2');
});

Deno.test('huge report leaves no room — returns empty', () => {
  // 100k chars * 4 bytes/token ≈ 100k tokens — exceeds budget when overhead added
  const huge = 'x'.repeat(400_000);
  const history = [...pair('q', 'a')];
  assertEquals(trimHistory({ reportText: huge, history }), []);
});

Deno.test('drops oldest pairs when over budget', () => {
  // Build a history that exceeds available tokens
  // 30 pairs × 200 chars each = 6000 chars per pair = ~1500 tokens per pair
  // 30 pairs × 1500 = 45000 tokens
  // With a tiny report and 100k budget, we have ~96452 tokens for history → all fit
  // To force trimming, set maxTokens=10000 (so available = 10000 - small - 3548 ≈ 6400 tokens)
  const history: ChatMessage[] = [];
  for (let i = 0; i < 10; i++) {
    history.push(...pair('q'.repeat(800), 'a'.repeat(800)));
  }
  // 10 pairs × 400 tokens each = 4000 tokens of history
  const tinyReport = 'short';
  const result = trimHistory({ reportText: tinyReport, history, maxTokens: 7000 });
  // Available: 7000 - 1 - 3548 = 3451. Each pair = 400. Should keep ~8 pairs.
  assert(result.length < history.length, 'should drop something');
  assert(result.length > 0, 'should keep something');
  // The KEPT messages should be the most recent ones
  const lastKept = result[result.length - 1];
  assertEquals(lastKept.content, 'a'.repeat(800)); // newest assistant
});

Deno.test('preserves user/assistant pair structure', () => {
  const history: ChatMessage[] = [];
  for (let i = 0; i < 20; i++) {
    history.push(...pair(`q${i}`, `a${i}`));
  }
  const result = trimHistory({ reportText: 'r', history, maxTokens: 5000 });
  // Result length should be even (full pairs only)
  assertEquals(result.length % 2, 0);
  // Each user should be followed by an assistant
  for (let i = 0; i < result.length; i += 2) {
    assertEquals(result[i].role, 'user');
    assertEquals(result[i + 1].role, 'assistant');
  }
});

Deno.test('odd-length history: drops oldest single message defensively', () => {
  // History starts with a stray assistant message (shouldn't happen in real flow, but be defensive)
  const history: ChatMessage[] = [
    { role: 'assistant', content: 'orphan' }, // <- will be dropped
    ...pair('q1', 'a1'),
    ...pair('q2', 'a2'),
  ];
  const result = trimHistory({ reportText: 'r', history });
  // Orphan should not appear
  assert(!result.some((m) => m.content === 'orphan'));
  // q1, a1, q2, a2 should all survive (under budget)
  assertEquals(result.length, 4);
});

Deno.test('does not mutate input history', () => {
  const history = [...pair('q', 'a')];
  const before = JSON.stringify(history);
  trimHistory({ reportText: 'r', history, maxTokens: 100 });
  const after = JSON.stringify(history);
  assertEquals(before, after);
});

Deno.test('respects custom maxTokens', () => {
  const history: ChatMessage[] = [];
  for (let i = 0; i < 5; i++) {
    history.push(...pair('q'.repeat(400), 'a'.repeat(400)));
  }
  // Each pair = ceil(400/4)*2 = 200 tokens. 5 pairs = 1000 tokens of history.
  // With a generous custom budget, all should fit
  const generous = trimHistory({ reportText: 'r', history, maxTokens: 50_000 });
  assertEquals(generous.length, 10);
  // With a tight custom budget (available ≈ 200 tokens → only 1 pair fits), some should drop
  const tight = trimHistory({ reportText: 'r', history, maxTokens: 3750 });
  assert(tight.length < 10);
});

Deno.test('DEFAULT_MAX_TOKENS is exported and is 100_000', () => {
  assertEquals(DEFAULT_MAX_TOKENS, 100_000);
});
