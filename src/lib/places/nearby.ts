import { haversineKm, type LatLng } from './distance';

export type NearbyType = 'hospital' | 'lab';

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  distanceKm: number;
}

export interface SearchInput {
  lat: number;
  lng: number;
  type: NearbyType;
  radius: number;
}

const TYPE_TO_PRIMARY: Record<NearbyType, string> = {
  hospital: 'hospital',
  lab: 'medical_lab',
};

const FIELDS = ['id', 'displayName', 'formattedAddress', 'location'];

export async function searchNearbyPlaces(
  placesLib: google.maps.PlacesLibrary,
  input: SearchInput,
): Promise<NearbyPlace[]> {
  const { places } = await placesLib.Place.searchNearby({
    fields: FIELDS,
    locationRestriction: {
      center: { lat: input.lat, lng: input.lng },
      radius: input.radius,
    },
    includedPrimaryTypes: [TYPE_TO_PRIMARY[input.type]],
    maxResultCount: 20,
  });

  if (!places) return [];

  const origin = { lat: input.lat, lng: input.lng };
  return places.map((p) => {
    const lat = typeof p.location?.lat === 'function' ? p.location.lat() : 0;
    const lng = typeof p.location?.lng === 'function' ? p.location.lng() : 0;
    return {
      id: p.id ?? '',
      name: p.displayName ?? '',
      address: p.formattedAddress ?? '',
      location: { lat, lng },
      distanceKm: haversineKm(origin, { lat, lng }),
    };
  });
}
