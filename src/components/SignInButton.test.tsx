import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signInMock = vi.fn();
vi.mock('@/lib/auth/signIn', () => ({
  signInWithGoogle: signInMock,
}));

beforeEach(() => signInMock.mockReset());

describe('SignInButton', () => {
  it('calls signInWithGoogle with window.location.origin on click', async () => {
    signInMock.mockResolvedValue(undefined);
    const { SignInButton } = await import('./SignInButton');
    render(<SignInButton />);
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(signInMock).toHaveBeenCalledWith(window.location.origin);
  });

  it('renders the button with accessible label', async () => {
    const { SignInButton } = await import('./SignInButton');
    render(<SignInButton />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });
});
