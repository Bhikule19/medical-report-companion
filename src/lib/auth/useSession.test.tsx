import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Session, Subscription, SupabaseClient } from '@supabase/supabase-js';

let listener: ((event: string, session: Session | null) => void) | null = null;
const fakeClient = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn((cb: (e: string, s: Session | null) => void) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } as unknown as Subscription } };
    }),
  },
} as unknown as SupabaseClient;

vi.mock('@/lib/supabase/browserClient', () => ({
  getBrowserSupabase: () => fakeClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
  listener = null;
});

describe('useSession', () => {
  it('starts with loading=true and resolves to a session', async () => {
    const session = { access_token: 't', user: { email: 'a@b.co' } } as unknown as Session;
    (fakeClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session },
      error: null,
    });

    const { useSession } = await import('./useSession');
    const { result } = renderHook(() => useSession());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session?.access_token).toBe('t');
  });

  it('updates when onAuthStateChange fires', async () => {
    (fakeClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { useSession } = await import('./useSession');
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();

    const session = { access_token: 'new' } as unknown as Session;
    listener!('SIGNED_IN', session);
    await waitFor(() => expect(result.current.session?.access_token).toBe('new'));
  });
});
