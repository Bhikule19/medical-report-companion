import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NearbyTypeFilter } from './NearbyTypeFilter';

describe('NearbyTypeFilter', () => {
  it('renders both chips with the active one marked', () => {
    render(<NearbyTypeFilter value="hospital" onChange={() => {}} />);
    const hospital = screen.getByRole('radio', { name: /hospitals/i });
    const lab = screen.getByRole('radio', { name: /labs/i });
    expect(hospital).toHaveAttribute('data-state', 'on');
    expect(lab).toHaveAttribute('data-state', 'off');
  });

  it('fires onChange when clicked', async () => {
    const onChange = vi.fn();
    render(<NearbyTypeFilter value="hospital" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /labs/i }));
    expect(onChange).toHaveBeenCalledWith('lab');
  });

  it('does not fire onChange when clicking the active chip', async () => {
    const onChange = vi.fn();
    render(<NearbyTypeFilter value="hospital" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /hospitals/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
