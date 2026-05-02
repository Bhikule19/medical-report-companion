import { describe, it, expect } from 'vitest';
import { haversineKm } from './distance';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm({ lat: 19.07, lng: 72.87 }, { lat: 19.07, lng: 72.87 })).toBe(0);
  });

  it('approximates known distance Mumbai → Pune (~120 km)', () => {
    const mumbai = { lat: 19.076, lng: 72.8777 };
    const pune = { lat: 18.5204, lng: 73.8567 };
    const km = haversineKm(mumbai, pune);
    expect(km).toBeGreaterThan(115);
    expect(km).toBeLessThan(125);
  });

  it('is symmetric', () => {
    const a = { lat: 12.97, lng: 77.59 };
    const b = { lat: 13.08, lng: 80.27 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});
