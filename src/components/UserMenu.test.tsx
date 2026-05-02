import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signOutMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('@/lib/auth/signOut', () => ({ signOut: signOutMock }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

beforeEach(() => {
  signOutMock.mockReset();
  replaceMock.mockReset();
});

describe('UserMenu', () => {
  it('renders the email and a sign-out button', async () => {
    const { UserMenu } = await import('./UserMenu');
    render(<UserMenu email="user@example.com" />);
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('signs out and redirects to /sign-in on click', async () => {
    signOutMock.mockResolvedValue(undefined);
    const { UserMenu } = await import('./UserMenu');
    render(<UserMenu email="user@example.com" />);
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/sign-in'));
  });
});
