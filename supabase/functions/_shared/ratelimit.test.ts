import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createRateLimiter } from './ratelimit.ts';

Deno.test('allows up to N requests per window', () => {
  const rl = createRateLimiter({ limit: 3, windowMs: 60_000 });
  for (let i = 0; i < 3; i++) assertEquals(rl.check('1.1.1.1').allowed, true);
  assertEquals(rl.check('1.1.1.1').allowed, false);
});

Deno.test('isolates by key', () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
  assertEquals(rl.check('a').allowed, true);
  assertEquals(rl.check('b').allowed, true);
  assertEquals(rl.check('a').allowed, false);
});

Deno.test('resets after window expires', async () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 50 });
  assertEquals(rl.check('x').allowed, true);
  assertEquals(rl.check('x').allowed, false);
  await new Promise((r) => setTimeout(r, 70));
  assertEquals(rl.check('x').allowed, true);
});

Deno.test('returns remaining count', () => {
  const rl = createRateLimiter({ limit: 5, windowMs: 60_000 });
  assertEquals(rl.check('y').remaining, 4);
  assertEquals(rl.check('y').remaining, 3);
  assertEquals(rl.check('y').remaining, 2);
});
