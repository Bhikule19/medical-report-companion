import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentGate } from './ConsentGate';
import { POLICY_VERSION } from '@/lib/legal/versions';

beforeEach(() => {
  localStorage.clear();
});

describe('ConsentGate', () => {
  it('renders the interstitial when no acknowledgement exists', () => {
    render(
      <ConsentGate>
        <p>protected</p>
      </ConsentGate>,
    );
    expect(
      screen.getByRole('heading', { name: /before you continue/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });

  it('renders children when current ack is stored', () => {
    localStorage.setItem('tos-acknowledged-version', POLICY_VERSION);
    render(
      <ConsentGate>
        <p>protected</p>
      </ConsentGate>,
    );
    expect(screen.getByText('protected')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /before you continue/i }),
    ).not.toBeInTheDocument();
  });

  it('renders interstitial when stored version is stale', () => {
    localStorage.setItem('tos-acknowledged-version', '2024-01-01');
    render(
      <ConsentGate>
        <p>protected</p>
      </ConsentGate>,
    );
    expect(
      screen.getByRole('heading', { name: /before you continue/i }),
    ).toBeInTheDocument();
  });

  it('swaps to children after Continue is clicked', async () => {
    render(
      <ConsentGate>
        <p>protected</p>
      </ConsentGate>,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('protected')).toBeInTheDocument();
    expect(localStorage.getItem('tos-acknowledged-version')).toBe(POLICY_VERSION);
  });
});
