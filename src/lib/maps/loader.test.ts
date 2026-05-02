import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('getMapsConfig', () => {
  it('returns key + libraries when env var present', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key');
    const { getMapsConfig } = await import('./loader');
    expect(getMapsConfig()).toEqual({ apiKey: 'test-key', libraries: ['places', 'marker'] });
    vi.unstubAllEnvs();
  });

  it('throws when env var missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '');
    const { getMapsConfig } = await import('./loader');
    expect(() => getMapsConfig()).toThrow(/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/);
    vi.unstubAllEnvs();
  });
});
