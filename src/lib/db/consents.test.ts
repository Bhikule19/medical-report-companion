import { describe, it, expect, vi } from 'vitest';
import { getConsents, updateConsents, DEFAULT_CONSENTS } from './consents';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (r: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

function fakeClient(chain: ReturnType<typeof makeChain>): SupabaseClient {
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

describe('getConsents', () => {
  it('returns row when present', async () => {
    const chain = makeChain({
      data: {
        store_reports: false,
        store_chat: true,
        store_voice_transcripts: false,
      },
      error: null,
    });
    const client = fakeClient(chain);
    const result = await getConsents(client, 'u-1');
    expect(client.from).toHaveBeenCalledWith('consents');
    expect(chain.select).toHaveBeenCalledWith(
      'store_reports, store_chat, store_voice_transcripts',
    );
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(result).toEqual({
      store_reports: false,
      store_chat: true,
      store_voice_transcripts: false,
    });
  });

  it('returns DEFAULT_CONSENTS when no row exists', async () => {
    const chain = makeChain({ data: null, error: null });
    const client = fakeClient(chain);
    const result = await getConsents(client, 'u-1');
    expect(result).toEqual(DEFAULT_CONSENTS);
  });

  it('throws on a real error', async () => {
    const chain = makeChain({ data: null, error: { message: 'rls_denied' } });
    const client = fakeClient(chain);
    await expect(getConsents(client, 'u-1')).rejects.toThrow(/rls_denied/);
  });
});

describe('updateConsents', () => {
  it('upserts the merged payload with user_id PK', async () => {
    const chain = makeChain({ data: null, error: null });
    const client = fakeClient(chain);
    await updateConsents(client, 'u-1', { store_chat: false });
    expect(client.from).toHaveBeenCalledWith('consents');
    expect(chain.upsert).toHaveBeenCalledWith(
      { user_id: 'u-1', store_chat: false },
      { onConflict: 'user_id' },
    );
  });

  it('throws on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'rls_denied' } });
    const client = fakeClient(chain);
    await expect(
      updateConsents(client, 'u-1', { store_reports: false }),
    ).rejects.toThrow(/rls_denied/);
  });
});
