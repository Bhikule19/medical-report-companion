import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

const fakeClient = {
  auth: {
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
  },
} as unknown as SupabaseClient;

vi.mock('@/lib/supabase/browserClient', () => ({
  getBrowserSupabase: () => fakeClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signInWithGoogle', () => {
  it('calls supabase OAuth with provider=google and correct redirect', async () => {
    const { signInWithGoogle } = await import('./signIn');
    (fakeClient.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { provider: 'google', url: '...' },
      error: null,
    });

    await signInWithGoogle('http://localhost:3000');

    expect(fakeClient.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:3000/auth/callback' },
    });
  });

  it('throws when supabase returns an error', async () => {
    const { signInWithGoogle } = await import('./signIn');
    (fakeClient.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'provider_disabled' },
    });
    await expect(signInWithGoogle('http://localhost:3000')).rejects.toThrow(/provider_disabled/);
  });
});

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    const { signOut } = await import('./signOut');
    (fakeClient.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    await signOut();
    expect(fakeClient.auth.signOut).toHaveBeenCalled();
  });
});

describe('getSessionToken', () => {
  it('returns access_token when session exists', async () => {
    const { getSessionToken } = await import('./session');
    (fakeClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { access_token: 'jwt-token' } as Session },
      error: null,
    });
    expect(await getSessionToken()).toBe('jwt-token');
  });

  it('returns null when no session', async () => {
    const { getSessionToken } = await import('./session');
    (fakeClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    expect(await getSessionToken()).toBeNull();
  });
});
