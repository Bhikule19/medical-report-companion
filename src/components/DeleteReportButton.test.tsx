import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteReportButton } from './DeleteReportButton';

describe('DeleteReportButton', () => {
  it('opens the dialog when × is clicked', async () => {
    render(<DeleteReportButton onDelete={async () => {}} disabled={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /delete report/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onDelete on confirm and closes the dialog on success', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<DeleteReportButton onDelete={onDelete} disabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: /delete report/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the dialog open and shows error on failure', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('rls_denied'));
    render(<DeleteReportButton onDelete={onDelete} disabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: /delete report/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/rls_denied/));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('cancel closes the dialog without calling onDelete', async () => {
    const onDelete = vi.fn();
    render(<DeleteReportButton onDelete={onDelete} disabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: /delete report/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('× button is disabled when disabled=true', () => {
    render(<DeleteReportButton onDelete={async () => {}} disabled />);
    expect(screen.getByRole('button', { name: /delete report/i })).toBeDisabled();
  });
});
