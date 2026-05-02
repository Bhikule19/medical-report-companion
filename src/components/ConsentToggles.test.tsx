import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentToggles } from './ConsentToggles';
import { DEFAULT_CONSENTS } from '@/lib/db/consents';

describe('ConsentToggles', () => {
  it('renders three labelled switches with descriptions', () => {
    render(<ConsentToggles values={DEFAULT_CONSENTS} disabled={false} onChange={() => {}} />);
    expect(screen.getByLabelText(/save reports/i)).toBeChecked();
    expect(screen.getByLabelText(/save chat/i)).toBeChecked();
    expect(screen.getByLabelText(/save voice/i)).toBeChecked();
  });

  it('fires onChange with the right key and new value', async () => {
    const onChange = vi.fn();
    render(<ConsentToggles values={DEFAULT_CONSENTS} disabled={false} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText(/save chat/i));
    expect(onChange).toHaveBeenCalledWith('store_chat', false);
  });

  it('disables all toggles when disabled=true', () => {
    render(<ConsentToggles values={DEFAULT_CONSENTS} disabled onChange={() => {}} />);
    expect(screen.getByLabelText(/save reports/i)).toBeDisabled();
    expect(screen.getByLabelText(/save chat/i)).toBeDisabled();
    expect(screen.getByLabelText(/save voice/i)).toBeDisabled();
  });
});
