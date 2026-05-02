import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders Privacy and Terms links with correct hrefs', () => {
    render(<Footer />);
    const privacy = screen.getByRole('link', { name: /privacy/i });
    const terms = screen.getByRole('link', { name: /terms/i });
    expect(privacy).toHaveAttribute('href', '/privacy');
    expect(terms).toHaveAttribute('href', '/terms');
  });
});
