'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Topbar } from '@/components/shell/Topbar';
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
  const [activeId, setActiveId] = useState<string | null>(null);

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
        if (!cancelled) {
          setItems(results);
          setActiveId(null);
        }
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
    <>
      <Topbar title="Labs nearby" crumb="Places" />

      <div className="flex-1 overflow-y-auto px-8 py-7 max-md:px-4 max-md:py-4">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <NearbyTypeFilter value={type} onChange={setType} />
            {coords && (
              <span className="text-[12px] text-muted">
                {loading
                  ? 'Searching nearby…'
                  : `${sortedItems.length} ${type === 'hospital' ? 'hospitals' : 'labs'} within 5 km`}
              </span>
            )}
          </div>

          {geoError && (
            <div
              role="alert"
              className="rounded-md border border-amber-soft bg-amber-soft/40 p-3.5 text-[13px] text-amber"
            >
              {geoError}{' '}
              <button
                type="button"
                onClick={requestLocation}
                className="font-medium underline hover:text-ink-2"
              >
                Retry
              </button>
            </div>
          )}

          {!geoError && !coords && (
            <p className="text-[13px] text-muted">Reading your location…</p>
          )}

          {searchError && (
            <div role="alert" className="rounded-md bg-red-soft px-3.5 py-2.5 text-[13px] text-red">
              {searchError}
            </div>
          )}

          {coords && (
            <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
              <div className="min-h-0 overflow-y-auto pr-1">
                <NearbyList items={sortedItems} activeId={activeId} onSelect={setActiveId} />
              </div>
              <NearbyMap
                centre={coords}
                items={sortedItems}
                activeId={activeId}
                onSelect={setActiveId}
                className="relative h-[600px] w-full overflow-hidden rounded-lg border border-line-2 bg-[#dfeaf0] max-lg:h-[420px]"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function NearbyPage() {
  return (
    <APIProvider apiKey={config.apiKey} libraries={config.libraries}>
      <NearbyContent />
    </APIProvider>
  );
}
