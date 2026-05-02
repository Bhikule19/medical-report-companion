import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentInterstitial } from './ConsentInterstitial';

describe('ConsentInterstitial', () => {
  it('renders heading and a disabled Continue button initially', () => {
    render(<ConsentInterstitial onAccept={() => {}} />);
    expect(
      screen.getByRole('heading', { name: /before you continue/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('renders policy and ToS links that open in a new tab', () => {
    render(<ConsentInterstitial onAccept={() => {}} />);
    const privacy = screen.getByRole('link', { name: /privacy policy/i });
    const terms = screen.getByRole('link', { name: /terms of service/i });
    expect(privacy).toHaveAttribute('href', '/privacy');
    expect(privacy).toHaveAttribute('target', '_blank');
    expect(privacy).toHaveAttribute('rel', 'noopener noreferrer');
    expect(terms).toHaveAttribute('href', '/terms');
    expect(terms).toHaveAttribute('target', '_blank');
    expect(terms).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('enables Continue once the checkbox is ticked', async () => {
    render(<ConsentInterstitial onAccept={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });

  it('fires onAccept when Continue is clicked after ticking the box', async () => {
    const onAccept = vi.fn();
    render(<ConsentInterstitial onAccept={onAccept} />);
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onAccept).toHaveBeenCalled();
  });
});
