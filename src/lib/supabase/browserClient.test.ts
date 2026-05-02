import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('getBrowserSupabase', () => {
  it('returns the same instance on repeat calls (singleton)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    const { getBrowserSupabase } = await import('./browserClient');
    const a = getBrowserSupabase();
    const b = getBrowserSupabase();
    expect(a).toBe(b);
    vi.unstubAllEnvs();
  });

  it('throws when env vars missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const { getBrowserSupabase } = await import('./browserClient');
    expect(() => getBrowserSupabase()).toThrow(/NEXT_PUBLIC_SUPABASE/);
    vi.unstubAllEnvs();
  });
});
