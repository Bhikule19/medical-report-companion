import { describe, it, expect, vi } from 'vitest';
import { searchNearbyPlaces, type NearbyType } from './nearby';

interface FakePlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: { lat: () => number; lng: () => number };
}

interface FakePlacesLib {
  Place: {
    searchNearby: ReturnType<typeof vi.fn>;
  };
}

describe('searchNearbyPlaces', () => {
  it('calls Place.searchNearby with the right request and returns mapped DTO with distance', async () => {
    const fakeResults: FakePlace[] = [
      {
        id: 'p1',
        displayName: 'Acme Hospital',
        formattedAddress: '1 A St',
        location: { lat: () => 19.08, lng: () => 72.88 },
      },
    ];
    const searchNearby = vi.fn().mockResolvedValue({ places: fakeResults });
    const placesLib: FakePlacesLib = { Place: { searchNearby } };

    const result = await searchNearbyPlaces(
      placesLib as unknown as google.maps.PlacesLibrary,
      {
        lat: 19.076,
        lng: 72.8777,
        type: 'hospital',
        radius: 5000,
      },
    );

    expect(searchNearby).toHaveBeenCalledTimes(1);
    const req = searchNearby.mock.calls[0][0];
    expect(req.includedPrimaryTypes).toEqual(['hospital']);
    expect(req.maxResultCount).toBe(20);
    expect(req.locationRestriction.center).toEqual({ lat: 19.076, lng: 72.8777 });
    expect(req.locationRestriction.radius).toBe(5000);
    expect(req.fields).toEqual(
      expect.arrayContaining(['id', 'displayName', 'formattedAddress', 'location']),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'p1',
      name: 'Acme Hospital',
      address: '1 A St',
      location: { lat: 19.08, lng: 72.88 },
    });
    expect(result[0].distanceKm).toBeGreaterThan(0);
    expect(result[0].distanceKm).toBeLessThan(2);
  });

  it('maps "lab" filter to medical_lab primary type', async () => {
    const searchNearby = vi.fn().mockResolvedValue({ places: [] });
    const placesLib: FakePlacesLib = { Place: { searchNearby } };

    await searchNearbyPlaces(placesLib as unknown as google.maps.PlacesLibrary, {
      lat: 0,
      lng: 0,
      type: 'lab' satisfies NearbyType,
      radius: 5000,
    });
    expect(searchNearby.mock.calls[0][0].includedPrimaryTypes).toEqual(['medical_lab']);
  });

  it('returns [] when Places returns no results', async () => {
    const searchNearby = vi.fn().mockResolvedValue({ places: null });
    const placesLib: FakePlacesLib = { Place: { searchNearby } };

    const result = await searchNearbyPlaces(
      placesLib as unknown as google.maps.PlacesLibrary,
      { lat: 0, lng: 0, type: 'hospital', radius: 5000 },
    );
    expect(result).toEqual([]);
  });

  it('propagates errors from the Places API', async () => {
    const searchNearby = vi.fn().mockRejectedValue(new Error('OVER_QUERY_LIMIT'));
    const placesLib: FakePlacesLib = { Place: { searchNearby } };

    await expect(
      searchNearbyPlaces(placesLib as unknown as google.maps.PlacesLibrary, {
        lat: 0,
        lng: 0,
        type: 'hospital',
        radius: 5000,
      }),
    ).rejects.toThrow(/OVER_QUERY_LIMIT/);
  });
});
