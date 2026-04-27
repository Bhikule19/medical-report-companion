export interface RateLimiter {
  check(key: string): { allowed: boolean; remaining: number };
}

export function createRateLimiter(opts: { limit: number; windowMs: number }): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key: string) {
      const now = Date.now();
      const b = buckets.get(key);
      if (!b || b.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        return { allowed: true, remaining: opts.limit - 1 };
      }
      if (b.count >= opts.limit) return { allowed: false, remaining: 0 };
      b.count += 1;
      return { allowed: true, remaining: opts.limit - b.count };
    },
  };
}
