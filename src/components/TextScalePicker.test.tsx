import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextScalePicker } from './TextScalePicker';

describe('TextScalePicker', () => {
  it('renders three options with correct labels', () => {
    render(<TextScalePicker value="standard" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /standard/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^large$/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /extra-large/i })).toBeInTheDocument();
  });

  it('marks the active option', () => {
    render(<TextScalePicker value="large" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /^large$/i })).toHaveAttribute(
      'data-state',
      'on',
    );
    expect(screen.getByRole('radio', { name: /standard/i })).toHaveAttribute(
      'data-state',
      'off',
    );
  });

  it('fires onChange when an inactive option is clicked', async () => {
    const onChange = vi.fn();
    render(<TextScalePicker value="standard" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /^large$/i }));
    expect(onChange).toHaveBeenCalledWith('large');
  });

  it('does not fire onChange when the active option is clicked', async () => {
    const onChange = vi.fn();
    render(<TextScalePicker value="standard" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /standard/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
