import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useSessionMock = vi.fn();
vi.mock('@/lib/auth/useSession', () => ({
  useSession: () => useSessionMock(),
}));

beforeEach(() => {
  replaceMock.mockReset();
  useSessionMock.mockReset();
});

describe('AuthGate', () => {
  it('renders children when a session exists', async () => {
    useSessionMock.mockReturnValue({ session: { access_token: 't' } as Session, loading: false });
    const { AuthGate } = await import('./AuthGate');
    render(
      <AuthGate>
        <p>protected</p>
      </AuthGate>,
    );
    expect(screen.getByText('protected')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects to /sign-in when no session and not loading', async () => {
    useSessionMock.mockReturnValue({ session: null, loading: false });
    const { AuthGate } = await import('./AuthGate');
    render(
      <AuthGate>
        <p>protected</p>
      </AuthGate>,
    );
    expect(replaceMock).toHaveBeenCalledWith('/sign-in');
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });

  it('renders nothing while loading', async () => {
    useSessionMock.mockReturnValue({ session: null, loading: true });
    const { AuthGate } = await import('./AuthGate');
    render(
      <AuthGate>
        <p>protected</p>
      </AuthGate>,
    );
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });
});
