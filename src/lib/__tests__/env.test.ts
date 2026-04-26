import { describe, it, expect } from 'vitest';
import { parseEnv } from '../env';

describe('parseEnv', () => {
  it('throws when required public vars are missing', () => {
    expect(() => parseEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('returns parsed env when valid', () => {
    const env = parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    });
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://x.supabase.co');
  });
});
