import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NearbyTypeFilter } from './NearbyTypeFilter';

describe('NearbyTypeFilter', () => {
  it('renders both chips with the active one styled differently', () => {
    render(<NearbyTypeFilter value="hospital" onChange={() => {}} />);
    const hospital = screen.getByRole('button', { name: /hospitals/i });
    const lab = screen.getByRole('button', { name: /labs/i });
    expect(hospital).toHaveAttribute('aria-pressed', 'true');
    expect(lab).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onChange when clicked', async () => {
    const onChange = vi.fn();
    render(<NearbyTypeFilter value="hospital" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /labs/i }));
    expect(onChange).toHaveBeenCalledWith('lab');
  });

  it('does not fire onChange when clicking the active chip', async () => {
    const onChange = vi.fn();
    render(<NearbyTypeFilter value="hospital" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /hospitals/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
