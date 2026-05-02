import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders title, body, and both buttons when open', () => {
    render(
      <ConfirmDialog
        open
        title="Delete report?"
        body="This cannot be undone."
        confirmLabel="Delete"
        confirmTone="danger"
        pending={false}
        error={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete report?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('does not render when open=false', () => {
    render(
      <ConfirmDialog
        open={false}
        title="x"
        body="y"
        confirmLabel="ok"
        confirmTone="primary"
        pending={false}
        error={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fires onConfirm and onCancel', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="t"
        body="b"
        confirmLabel="ok"
        confirmTone="primary"
        pending={false}
        error={null}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^ok$/i }));
    expect(onConfirm).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables buttons when pending=true', () => {
    render(
      <ConfirmDialog
        open
        title="t"
        body="b"
        confirmLabel="Delete"
        confirmTone="danger"
        pending
        error={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('renders error inline when provided', () => {
    render(
      <ConfirmDialog
        open
        title="t"
        body="b"
        confirmLabel="ok"
        confirmTone="primary"
        pending={false}
        error="Network error"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
  });
});
