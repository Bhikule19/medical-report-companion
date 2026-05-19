import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguagePicker } from './LanguagePicker';
import { useReportStore } from '@/store/useReportStore';

describe('LanguagePicker', () => {
  beforeEach(() => useReportStore.getState().reset());

  it('renders the trigger and exposes all 14 languages when opened', async () => {
    render(<LanguagePicker />);
    const trigger = screen.getByRole('button', { name: /language/i });
    expect(trigger).toBeInTheDocument();
    await userEvent.click(trigger);
    expect(screen.getAllByRole('option')).toHaveLength(14);
  });

  it('updates the store when a language is picked', async () => {
    render(<LanguagePicker />);
    await userEvent.click(screen.getByRole('button', { name: /language/i }));
    // Use the native-script label "தமிழ்" for Tamil to find the option row.
    await userEvent.click(screen.getByRole('option', { name: /தமிழ்/ }));
    expect(useReportStore.getState().language).toBe('ta');
  });

  it('is unresponsive while disabled', async () => {
    render(<LanguagePicker disabled />);
    const trigger = screen.getByRole('button', { name: /language/i });
    expect(trigger).toBeDisabled();
    await userEvent.click(trigger);
    expect(screen.queryByRole('option')).toBeNull();
  });
});
