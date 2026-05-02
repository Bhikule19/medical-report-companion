import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguagePicker } from './LanguagePicker';
import { useReportStore } from '@/store/useReportStore';

describe('LanguagePicker', () => {
  beforeEach(() => useReportStore.getState().reset());

  it('renders all 14 supported languages', () => {
    render(<LanguagePicker />);
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(14);
  });

  it('updates store on change', async () => {
    render(<LanguagePicker />);
    await userEvent.selectOptions(screen.getByLabelText(/language/i), 'ta');
    expect(useReportStore.getState().language).toBe('ta');
  });
});
