import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NearbyList } from './NearbyList';

const items = [
  {
    id: 'p1',
    name: 'Acme Hospital',
    address: '1 A St, Mumbai',
    location: { lat: 19.08, lng: 72.88 },
    distanceKm: 1.234,
  },
];

describe('NearbyList', () => {
  it('renders a row per item with name, address, distance', () => {
    render(<NearbyList items={items} />);
    expect(screen.getByText('Acme Hospital')).toBeInTheDocument();
    expect(screen.getByText('1 A St, Mumbai')).toBeInTheDocument();
    expect(screen.getByText(/1\.2 km/)).toBeInTheDocument();
  });

  it('builds an Open-in-Maps link with name and place id', () => {
    render(<NearbyList items={items} />);
    const link = screen.getByRole('link', { name: /open in maps/i });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('https://www.google.com/maps/search/?');
    expect(href).toContain('api=1');
    expect(href).toContain('query=Acme+Hospital');
    expect(href).toContain('query_place_id=p1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders empty state when items=[]', () => {
    render(<NearbyList items={[]} />);
    expect(screen.getByText(/no places found/i)).toBeInTheDocument();
  });
});
