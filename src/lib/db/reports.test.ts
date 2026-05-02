import { describe, it, expect, vi } from 'vitest';
import { createReport, listReports, getReport } from './reports';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };
  return chain;
}

function fakeClient(chain: ReturnType<typeof makeChain>): SupabaseClient {
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

describe('createReport', () => {
  it('inserts the report row and returns the new id', async () => {
    const chain = makeChain({
      data: { id: 'r-1', created_at: '2026-05-02T00:00:00Z' },
      error: null,
    });
    const client = fakeClient(chain);

    const result = await createReport(client, {
      userId: 'u-1',
      title: 'CBC report',
      extractedText: 'lorem',
      translatedText: 'lorem-hi',
      sourceLang: 'en',
      targetLang: 'hi',
      pageCount: 2,
    });

    expect(client.from).toHaveBeenCalledWith('reports');
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: 'u-1',
      title: 'CBC report',
      extracted_text: 'lorem',
      translated_text: 'lorem-hi',
      source_lang: 'en',
      target_lang: 'hi',
      page_count: 2,
    });
    expect(result.id).toBe('r-1');
  });

  it('throws when supabase returns an error', async () => {
    const chain = makeChain({ data: null, error: { message: 'rls_denied' } });
    const client = fakeClient(chain);
    await expect(
      createReport(client, {
        userId: 'u-1',
        title: 't',
        extractedText: 'x',
        translatedText: null,
        sourceLang: 'en',
        targetLang: 'hi',
        pageCount: null,
      }),
    ).rejects.toThrow(/rls_denied/);
  });
});

describe('listReports', () => {
  it('returns rows ordered desc by created_at', async () => {
    const chain = makeChain({
      data: [
        { id: 'r-2', title: 'B', created_at: '2026-05-02', target_lang: 'hi' },
        { id: 'r-1', title: 'A', created_at: '2026-05-01', target_lang: 'en' },
      ],
      error: null,
    });
    const client = fakeClient(chain);
    const rows = await listReports(client, 'u-1');
    expect(client.from).toHaveBeenCalledWith('reports');
    expect(chain.select).toHaveBeenCalledWith('id, title, created_at, target_lang');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(rows).toHaveLength(2);
  });
});

describe('getReport', () => {
  it('returns the full row by id', async () => {
    const chain = makeChain({
      data: {
        id: 'r-1',
        user_id: 'u-1',
        title: 'A',
        extracted_text: 'lorem',
        translated_text: 'lorem-hi',
        source_lang: 'en',
        target_lang: 'hi',
        page_count: 2,
        created_at: '2026-05-01',
      },
      error: null,
    });
    const client = fakeClient(chain);
    const row = await getReport(client, 'r-1');
    expect(client.from).toHaveBeenCalledWith('reports');
    expect(chain.eq).toHaveBeenCalledWith('id', 'r-1');
    expect(row.title).toBe('A');
  });
});
