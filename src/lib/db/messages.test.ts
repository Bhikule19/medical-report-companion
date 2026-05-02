import { describe, it, expect, vi } from 'vitest';
import { createMessage, listMessagesForReport } from './messages';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
  };
  return chain;
}

function fakeClient(chain: ReturnType<typeof makeChain>): SupabaseClient {
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

describe('createMessage', () => {
  it('inserts a row with the right shape and returns the new id', async () => {
    const chain = makeChain({ data: { id: 'm-1' }, error: null });
    const client = fakeClient(chain);
    const result = await createMessage(client, {
      reportId: 'r-1',
      userId: 'u-1',
      role: 'assistant',
      content: 'hello',
    });
    expect(client.from).toHaveBeenCalledWith('messages');
    expect(chain.insert).toHaveBeenCalledWith({
      report_id: 'r-1',
      user_id: 'u-1',
      role: 'assistant',
      content: 'hello',
      voice_input: false,
    });
    expect(result.id).toBe('m-1');
  });

  it('throws on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'rls_denied' } });
    const client = fakeClient(chain);
    await expect(
      createMessage(client, {
        reportId: 'r-1',
        userId: 'u-1',
        role: 'user',
        content: 'q',
      }),
    ).rejects.toThrow(/rls_denied/);
  });
});

describe('listMessagesForReport', () => {
  it('returns messages ordered asc by created_at', async () => {
    const chain = makeChain({
      data: [
        { id: 'm-1', role: 'assistant', content: 'summary', created_at: '1' },
        { id: 'm-2', role: 'user', content: 'q', created_at: '2' },
      ],
      error: null,
    });
    const client = fakeClient(chain);
    const rows = await listMessagesForReport(client, 'r-1');
    expect(chain.select).toHaveBeenCalledWith('id, role, content, created_at');
    expect(chain.eq).toHaveBeenCalledWith('report_id', 'r-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(rows).toHaveLength(2);
  });
});
