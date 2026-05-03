'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { AuthGate } from '@/components/AuthGate';
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
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-page-margin py-page-margin">
      <header className="flex items-center justify-between border-b border-outline-variant pb-4">
        <h1 className="font-display text-display text-on-surface">Nearby</h1>
        <Link
          href="/"
          className="text-body-md text-on-surface-variant underline transition-colors hover:text-on-surface"
        >
          ← Back
        </Link>
      </header>

      <NearbyTypeFilter value={type} onChange={setType} />

      {geoError && (
        <div
          role="alert"
          className="rounded-md border border-tertiary-container bg-tertiary-container/30 p-4 text-body-md text-on-tertiary-container"
        >
          {geoError}{' '}
          <button
            type="button"
            onClick={requestLocation}
            className="font-medium underline hover:text-on-surface"
          >
            Retry
          </button>
        </div>
      )}

      {!geoError && !coords && (
        <p className="text-body-md text-on-surface-variant">Reading your location…</p>
      )}

      {coords && (
        <>
          <NearbyMap centre={coords} items={sortedItems} />
          {loading && (
            <p className="text-body-md text-on-surface-variant">Searching…</p>
          )}
          {searchError && (
            <div
              role="alert"
              className="rounded-md bg-error-container p-3 text-body-md text-on-error-container"
            >
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
      <APIProvider apiKey={config.apiKey} libraries={config.libraries}>
        <NearbyContent />
      </APIProvider>
    </AuthGate>
  );
}
