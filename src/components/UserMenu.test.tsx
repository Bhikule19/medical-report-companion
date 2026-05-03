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
  it('renders an avatar trigger button', async () => {
    const { UserMenu } = await import('./UserMenu');
    render(<UserMenu email="user@example.com" />);
    expect(screen.getByRole('button', { name: /open profile menu/i })).toBeInTheDocument();
  });

  it('opens the dropdown and reveals email + sign-out item on click', async () => {
    const { UserMenu } = await import('./UserMenu');
    render(<UserMenu email="user@example.com" name="Alice Tester" />);
    await userEvent.click(screen.getByRole('button', { name: /open profile menu/i }));
    expect(await screen.findByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Alice Tester')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
  });

  it('signs out and redirects when the sign-out item is clicked', async () => {
    signOutMock.mockResolvedValue(undefined);
    const { UserMenu } = await import('./UserMenu');
    render(<UserMenu email="user@example.com" />);
    await userEvent.click(screen.getByRole('button', { name: /open profile menu/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /sign out/i }));
    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/sign-in'));
  });
});
