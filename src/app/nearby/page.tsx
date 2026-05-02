'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { AuthGate } from '@/components/AuthGate';
import { ConsentGate } from '@/components/ConsentGate';
import { Footer } from '@/components/Footer';
import { NearbyTypeFilter } from '@/components/NearbyTypeFilter';
import { NearbyList } from '@/components/NearbyList';
import { NearbyMap } from '@/components/NearbyMap';
import { getMapsConfig } from '@/lib/maps/loader';
import {
  searchNearbyPlaces,
  type NearbyPlace,
  type NearbyType,
} from '@/lib/places/nearby';

const config = getMapsConfig();

interface Coords {
  lat: number;
  lng: number;
}

function NearbyContent() {
  const placesLib = useMapsLibrary('places');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [type, setType] = useState<NearbyType>('hospital');
  const [items, setItems] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Your browser does not support geolocation.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            'Allow location access to find places nearby. Update your browser settings and reload.',
          );
        } else {
          setGeoError("Couldn't read your location. Please try again.");
        }
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (!coords || !placesLib) return;
    let cancelled = false;
    setLoading(true);
    setSearchError(null);
    searchNearbyPlaces(placesLib as unknown as google.maps.PlacesLibrary, {
      lat: coords.lat,
      lng: coords.lng,
      type,
      radius: 5000,
    })
      .then((results) => {
        if (!cancelled) setItems(results);
      })
      .catch((e: Error) => {
        if (!cancelled) setSearchError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coords, placesLib, type]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.distanceKm - b.distanceKm),
    [items],
  );

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nearby</h1>
        <Link href="/" className="text-sm text-slate-600 underline">
          Back
        </Link>
      </header>

      <NearbyTypeFilter value={type} onChange={setType} />

      {geoError && (
        <div role="alert" className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
          {geoError}{' '}
          <button type="button" onClick={requestLocation} className="underline">
            Retry
          </button>
        </div>
      )}

      {!geoError && !coords && (
        <p className="text-sm text-slate-600">Reading your location…</p>
      )}

      {coords && (
        <>
          <NearbyMap centre={coords} items={sortedItems} />
          {loading && <p className="text-sm text-slate-600">Searching…</p>}
          {searchError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {searchError}
            </div>
          )}
          {!loading && !searchError && <NearbyList items={sortedItems} />}
        </>
      )}
    </main>
  );
}

export default function NearbyPage() {
  return (
    <AuthGate>
      <ConsentGate>
        <APIProvider apiKey={config.apiKey} libraries={config.libraries}>
          <NearbyContent />
        </APIProvider>
        <Footer />
      </ConsentGate>
    </AuthGate>
  );
}
