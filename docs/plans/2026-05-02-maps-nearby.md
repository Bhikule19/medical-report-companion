# Maps — Nearby Labs & Hospitals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A `/nearby` page that lists and maps labs or hospitals within 5 km of the user's browser geolocation.

**Architecture:** Pure client-side. `@vis.gl/react-google-maps` (already in deps) loads the Maps JS API and the Places library on the page. A small wrapper `searchNearbyPlaces` calls `google.maps.places.Place.searchNearby` and returns a typed DTO with Haversine distance pre-computed. Two components — `NearbyTypeFilter` (chips) and `NearbyList` (rows + Maps deeplink) — plus a `<Map>` with markers complete the UI. No new Edge Functions, no migrations.

**Tech Stack:** Next.js 15.5.15 · React 19 · TypeScript · `@vis.gl/react-google-maps` 1.8 · Vitest 4 · @testing-library/react.

**Reference:** Design at `docs/plans/2026-05-02-maps-nearby-design.md`.

---

## Task 1: Maps loader + env check

**Files:**
- Create: `src/lib/maps/loader.ts`
- Create: `src/lib/maps/loader.test.ts`

**Step 1: Failing tests**

```typescript
// src/lib/maps/loader.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('getMapsConfig', () => {
  it('returns key + libraries when env var present', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key');
    const { getMapsConfig } = await import('./loader');
    expect(getMapsConfig()).toEqual({ apiKey: 'test-key', libraries: ['places', 'marker'] });
    vi.unstubAllEnvs();
  });

  it('throws when env var missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '');
    const { getMapsConfig } = await import('./loader');
    expect(() => getMapsConfig()).toThrow(/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/);
    vi.unstubAllEnvs();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```typescript
// src/lib/maps/loader.ts
export interface MapsConfig {
  apiKey: string;
  libraries: ('places' | 'marker')[];
}

export function getMapsConfig(): MapsConfig {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured');
  return { apiKey, libraries: ['places', 'marker'] };
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/lib/maps/loader.ts src/lib/maps/loader.test.ts
git commit -m "feat(maps): config loader with env-key validation"
```

---

## Task 2: Place type mapping + Haversine distance

**Files:**
- Create: `src/lib/places/distance.ts`
- Create: `src/lib/places/distance.test.ts`

**Step 1: Failing tests**

```typescript
// src/lib/places/distance.test.ts
import { describe, it, expect } from 'vitest';
import { haversineKm } from './distance';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm({ lat: 19.07, lng: 72.87 }, { lat: 19.07, lng: 72.87 })).toBe(0);
  });

  it('approximates known distance Mumbai → Pune (~120 km)', () => {
    const mumbai = { lat: 19.0760, lng: 72.8777 };
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
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```typescript
// src/lib/places/distance.ts
export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/lib/places/distance.ts src/lib/places/distance.test.ts
git commit -m "feat(places): Haversine distance utility"
```

---

## Task 3: searchNearbyPlaces wrapper

**Files:**
- Create: `src/lib/places/nearby.ts`
- Create: `src/lib/places/nearby.test.ts`

**Step 1: Failing tests**

```typescript
// src/lib/places/nearby.test.ts
import { describe, it, expect, vi } from 'vitest';
import { searchNearbyPlaces, type NearbyType } from './nearby';

interface FakePlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: { lat: () => number; lng: () => number };
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
    const placesLib = { Place: { searchNearby } } as unknown as google.maps.PlacesLibrary;

    const result = await searchNearbyPlaces(placesLib, {
      lat: 19.0760,
      lng: 72.8777,
      type: 'hospital',
      radius: 5000,
    });

    expect(searchNearby).toHaveBeenCalledTimes(1);
    const req = searchNearby.mock.calls[0][0];
    expect(req.includedPrimaryTypes).toEqual(['hospital']);
    expect(req.maxResultCount).toBe(20);
    expect(req.locationRestriction.center).toEqual({ lat: 19.0760, lng: 72.8777 });
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
    const placesLib = { Place: { searchNearby } } as unknown as google.maps.PlacesLibrary;

    await searchNearbyPlaces(placesLib, {
      lat: 0,
      lng: 0,
      type: 'lab' satisfies NearbyType,
      radius: 5000,
    });
    expect(searchNearby.mock.calls[0][0].includedPrimaryTypes).toEqual(['medical_lab']);
  });

  it('returns [] when Places returns no results', async () => {
    const searchNearby = vi.fn().mockResolvedValue({ places: null });
    const placesLib = { Place: { searchNearby } } as unknown as google.maps.PlacesLibrary;

    const result = await searchNearbyPlaces(placesLib, {
      lat: 0,
      lng: 0,
      type: 'hospital',
      radius: 5000,
    });
    expect(result).toEqual([]);
  });

  it('propagates errors from the Places API', async () => {
    const searchNearby = vi.fn().mockRejectedValue(new Error('OVER_QUERY_LIMIT'));
    const placesLib = { Place: { searchNearby } } as unknown as google.maps.PlacesLibrary;

    await expect(
      searchNearbyPlaces(placesLib, { lat: 0, lng: 0, type: 'hospital', radius: 5000 }),
    ).rejects.toThrow(/OVER_QUERY_LIMIT/);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```typescript
// src/lib/places/nearby.ts
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
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/lib/places/nearby.ts src/lib/places/nearby.test.ts
git commit -m "feat(places): searchNearbyPlaces wrapper with type mapping and distance"
```

---

## Task 4: NearbyTypeFilter component

**Files:**
- Create: `src/components/NearbyTypeFilter.tsx`
- Create: `src/components/NearbyTypeFilter.test.tsx`

**Step 1: Failing tests**

```typescript
// src/components/NearbyTypeFilter.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NearbyTypeFilter } from './NearbyTypeFilter';

describe('NearbyTypeFilter', () => {
  it('renders both chips with the active one styled differently', () => {
    render(<NearbyTypeFilter value="hospital" onChange={() => {}} />);
    const hospital = screen.getByRole('button', { name: /hospitals/i });
    const lab = screen.getByRole('button', { name: /labs/i });
    expect(hospital).toHaveAttribute('aria-pressed', 'true');
    expect(lab).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onChange when clicked', async () => {
    const onChange = vi.fn();
    render(<NearbyTypeFilter value="hospital" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /labs/i }));
    expect(onChange).toHaveBeenCalledWith('lab');
  });

  it('does not fire onChange when clicking the active chip', async () => {
    const onChange = vi.fn();
    render(<NearbyTypeFilter value="hospital" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /hospitals/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/NearbyTypeFilter.tsx
'use client';

import type { NearbyType } from '@/lib/places/nearby';

const OPTIONS: { value: NearbyType; label: string }[] = [
  { value: 'hospital', label: 'Hospitals' },
  { value: 'lab', label: 'Labs' },
];

export interface NearbyTypeFilterProps {
  value: NearbyType;
  onChange: (next: NearbyType) => void;
}

export function NearbyTypeFilter({ value, onChange }: NearbyTypeFilterProps) {
  return (
    <div className="flex gap-2" role="group" aria-label="Place type filter">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) onChange(opt.value);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/NearbyTypeFilter.tsx src/components/NearbyTypeFilter.test.tsx
git commit -m "feat(ui): NearbyTypeFilter with two chips and ARIA pressed state"
```

---

## Task 5: NearbyList component

**Files:**
- Create: `src/components/NearbyList.tsx`
- Create: `src/components/NearbyList.test.tsx`

**Step 1: Failing tests**

```typescript
// src/components/NearbyList.test.tsx
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
    expect(href).toContain('https://www.google.com/maps/search/?api=1');
    expect(href).toContain('query=Acme%20Hospital');
    expect(href).toContain('query_place_id=p1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders empty state when items=[]', () => {
    render(<NearbyList items={[]} />);
    expect(screen.getByText(/no places found/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/NearbyList.tsx
import type { NearbyPlace } from '@/lib/places/nearby';

function buildMapsUrl(item: NearbyPlace): string {
  const params = new URLSearchParams({
    api: '1',
    query: item.name,
    query_place_id: item.id,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

export interface NearbyListProps {
  items: NearbyPlace[];
}

export function NearbyList({ items }: NearbyListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No places found within 5 km.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-medium text-slate-900">{item.name}</h3>
              <p className="text-sm text-slate-600">{item.address}</p>
            </div>
            <span className="shrink-0 text-sm text-slate-500">{formatDistance(item.distanceKm)}</span>
          </div>
          <a
            href={buildMapsUrl(item)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-slate-700 underline"
          >
            Open in Maps
          </a>
        </li>
      ))}
    </ul>
  );
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/NearbyList.tsx src/components/NearbyList.test.tsx
git commit -m "feat(ui): NearbyList with distance, address, Open-in-Maps deeplink"
```

---

## Task 6: NearbyMap component (no test, runtime-only)

**Files:**
- Create: `src/components/NearbyMap.tsx`

**Step 1: Implementation**

```tsx
// src/components/NearbyMap.tsx
'use client';

import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { NearbyPlace } from '@/lib/places/nearby';

export interface NearbyMapProps {
  centre: { lat: number; lng: number };
  items: NearbyPlace[];
}

export function NearbyMap({ centre, items }: NearbyMapProps) {
  return (
    <div className="h-80 w-full overflow-hidden rounded-lg shadow-sm">
      <Map
        mapId="medical-report-companion-nearby"
        defaultCenter={centre}
        defaultZoom={14}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        <AdvancedMarker position={centre}>
          <Pin background="#1e293b" borderColor="#0f172a" glyphColor="#ffffff" />
        </AdvancedMarker>
        {items.map((item) => (
          <AdvancedMarker key={item.id} position={item.location}>
            <Pin background="#dc2626" borderColor="#991b1b" glyphColor="#ffffff" />
          </AdvancedMarker>
        ))}
      </Map>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/components/NearbyMap.tsx
git commit -m "feat(ui): NearbyMap with user pin + result markers"
```

---

## Task 7: /nearby page

**Files:**
- Create: `src/app/nearby/page.tsx`

**Step 1: Implementation**

```tsx
// src/app/nearby/page.tsx
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
          setGeoError('Allow location access to find places nearby. Update your browser settings and reload.');
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
    searchNearbyPlaces(placesLib, { lat: coords.lat, lng: coords.lng, type, radius: 5000 })
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
      <APIProvider apiKey={config.apiKey} libraries={config.libraries}>
        <NearbyContent />
      </APIProvider>
    </AuthGate>
  );
}
```

**Step 2: Verify build**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/app/nearby/page.tsx
git commit -m "feat(ui): /nearby page with geolocation, map, and results list"
```

---

## Task 8: Header link from home page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add a "Find nearby" link in the header next to Settings.**

Find the existing header block and add the link:

```tsx
<Link href="/nearby" className="text-sm text-slate-600 underline">
  Find nearby
</Link>
<Link href="/settings" className="text-sm text-slate-600 underline">
  Settings
</Link>
```

**Step 2: Verify**

```bash
pnpm test && pnpm lint && pnpm build
```

All green.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(ui): \"Find nearby\" link in home-page header"
```

---

## Task 9: Final smoke + PR

**Step 1: Manual smoke**

```bash
pnpm dev
```

1. Sign in. Visit `/nearby` → granted location → map centres on you, hospital markers + list populate.
2. Toggle to Labs → markers + list update.
3. Click "Open in Maps" on a row → external Google Maps tab opens at that place.
4. Block location in browser settings → reload `/nearby` → see the permission banner with Retry.
5. Disable JS network (or mistype the API key) → see the page-level "Couldn't load Google Maps" path. (Skip if too disruptive.)

If anything misbehaves, fix and commit.

**Step 2: Push branch**

```bash
git push -u origin feat/maps-nearby
```

**Step 3: Open PR**

```bash
gh pr create --base master \
  --title "feat: /nearby page — labs and hospitals via Google Places (Phase 5)" \
  --body "$(cat <<'EOF'
## Summary
- New `/nearby` page that lists and maps labs or hospitals within 5 km of the user's geolocation.
- Uses `@vis.gl/react-google-maps` (already in deps) + Google Places Library — no Edge Function, no migration.
- Type filter chips toggle between Hospitals (default) and Labs (`medical_lab`).
- Each result shows name, address, distance (km, Haversine), and an "Open in Maps" deeplink that opens Google Maps with the place pre-selected.
- "Find nearby" link added to the home-page header.
- Auth-gated like the rest of the product.

## Design + plan
- `docs/plans/2026-05-02-maps-nearby-design.md`
- `docs/plans/2026-05-02-maps-nearby.md`

## Required Google Cloud setup (please verify before testing)
- **Maps JavaScript API** enabled.
- **Places API (New)** enabled.
- HTTP referrer restriction on the API key includes `http://localhost:3000/*`.
- API key restriction limits the key to the two APIs above.

The key is already in `.env.local` as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. If either API is disabled, you'll see the "Couldn't load Google Maps" or empty-results path instead of the actual data.

## Test plan
- [ ] `pnpm install && pnpm test` (all green)
- [ ] `pnpm build` (succeeds)
- [ ] Sign in → `/nearby` → grant location → map + hospital markers + list
- [ ] Toggle to Labs → results update
- [ ] Click "Open in Maps" → external tab opens at the right place
- [ ] Deny location → permission banner with Retry
- [ ] Direct nav to `/nearby` while signed out → bounced to `/sign-in`

## Out of scope
- Manual address input via Places Autocomplete.
- Pharmacy / urgent-care types.
- Drive/walk-time estimates.
- Server-side rate limiting via Edge Function.
- Phase 6 — voice (STT + TTS).
EOF
)"
```

---

## Done definition

- All 9 tasks committed.
- `pnpm test` passes.
- `pnpm build` succeeds.
- Manual smoke confirms map, list, filter, deeplink, and permission banner.
- PR open against `master`.
