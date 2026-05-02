import { describe, it, expect } from 'vitest';
import { getSupabaseConfig } from './env';

describe('getSupabaseConfig', () => {
  it('returns url and key when both present', () => {
    const cfg = getSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'abc',
    });
    expect(cfg).toEqual({ url: 'https://x.supabase.co', anonKey: 'abc' });
  });

  it('throws when url is missing', () => {
    expect(() => getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'abc' })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it('throws when key is missing', () => {
    expect(() =>
      getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
