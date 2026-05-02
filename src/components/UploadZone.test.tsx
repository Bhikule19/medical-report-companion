import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadZone } from './UploadZone';

describe('UploadZone', () => {
  it('calls onFile with a valid PDF', async () => {
    const onFile = vi.fn();
    render(<UploadZone onFile={onFile} disabled={false} />);
    const file = new File(['x'], 'r.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText(/upload report/i), file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('rejects files over 10MB and shows an error', async () => {
    const onFile = vi.fn();
    render(<UploadZone onFile={onFile} disabled={false} />);
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    });
    await userEvent.upload(screen.getByLabelText(/upload report/i), big);
    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/too large/i);
  });

  it('rejects unsupported file types (defensive JS guard)', () => {
    const onFile = vi.fn();
    render(<UploadZone onFile={onFile} disabled={false} />);
    // userEvent.upload respects the input's `accept` attribute and would short-circuit;
    // fireEvent bypasses that filter so we can exercise our defensive JS check.
    const input = screen.getByLabelText(/upload report/i) as HTMLInputElement;
    const f = new File(['x'], 'r.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [f] } });
    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/pdf or image/i);
  });

  it('disables input when disabled prop is true', () => {
    render(<UploadZone onFile={() => {}} disabled />);
    expect(screen.getByLabelText(/upload report/i)).toBeDisabled();
  });
});
