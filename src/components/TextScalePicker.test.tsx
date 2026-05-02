import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextScalePicker } from './TextScalePicker';

describe('TextScalePicker', () => {
  it('renders three buttons with correct labels', () => {
    render(<TextScalePicker value="standard" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /standard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^large$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /extra-large/i })).toBeInTheDocument();
  });

  it('marks the active option with aria-pressed=true', () => {
    render(<TextScalePicker value="large" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /^large$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /standard/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('fires onChange when an inactive option is clicked', async () => {
    const onChange = vi.fn();
    render(<TextScalePicker value="standard" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^large$/i }));
    expect(onChange).toHaveBeenCalledWith('large');
  });

  it('does not fire onChange when the active option is clicked', async () => {
    const onChange = vi.fn();
    render(<TextScalePicker value="standard" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /standard/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
