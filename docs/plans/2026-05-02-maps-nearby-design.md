# Maps — Nearby Labs & Hospitals — Design

**Date:** 2026-05-02
**Branch:** `feat/maps-nearby`
**Phase mapping:** Phase 5 of the master plan, scoped down.

## Problem

The product memory locks Maps as "logistics-only — find nearby labs/hospitals" because of the regulatory firewall around medical advice. The frontend has no way to surface that, so users who get a summary of their report still have to leave the app to find a place that can run a follow-up test.

## Goal

A new page **`/nearby`** that, given the user's browser geolocation, lists and maps labs or hospitals within 5 km. Two filter chips. No medical advice — just logistics.

## Out of scope (this PR)

- Manual address input (would require Places Autocomplete + Geocoding — second integration surface for an edge case).
- Pharmacies and other place types.
- Driving / walking time estimates per result.
- Per-IP rate limiting via Edge Function. The original Phase 5 hint suggested 20 req/min server-side; for v1 we rely on Google's per-key quota plus HTTP referrer restriction. If real abuse appears, revisit by proxying through a function.

## Architecture

**No new Edge Function.** Reasoning:

- The Maps JS API key is already public in the browser bundle (it must be, to render the map). HTTP referrer restriction is the actual security boundary.
- Google's per-key quota handles abuse at our scale.
- A proxy function adds latency and a deploy step without adding security in this configuration.

```
src/lib/maps/
  loader.ts                     env-key check; thin export of the API key + libraries list
  loader.test.ts

src/lib/places/
  nearby.ts                     searchNearbyPlaces(places, { lat, lng, type, radius })
  nearby.test.ts                mock the Places library; verify request shape and DTO mapping

src/components/
  NearbyTypeFilter.tsx          two-chip filter (Labs | Hospitals)
  NearbyTypeFilter.test.tsx
  NearbyList.tsx                results list with distance + "Open in Maps" link
  NearbyList.test.tsx
  NearbyMap.tsx                 <Map> + markers — runtime-only, no jsdom test

src/app/nearby/
  page.tsx                      AuthGate-wrapped; geolocation + composition
src/app/page.tsx                +"Find nearby" link in the header
```

## Data flow

1. Click "Find nearby" in the home-page header → `/nearby`.
2. On mount: `navigator.geolocation.getCurrentPosition`. Show permission banner until granted.
3. Once granted: hold `{ lat, lng }` in component state. Default type = `hospital`.
4. On (location || type) change: call `searchNearbyPlaces({ places, lat, lng, type, radius: 5000 })`. Type maps to Google primary types: `hospital` → `'hospital'`, `lab` → `'medical_lab'`.
5. Render `<NearbyMap>` centred on the user with a marker per result, and `<NearbyList>` below with name, formatted address, distance in km, and an "Open in Maps" link that builds:
   `https://www.google.com/maps/search/?api=1&query=<name>&query_place_id=<id>`
6. Loading + empty + error states inline.

## Geolocation strategy

Browser-native `navigator.geolocation.getCurrentPosition` with `{ enableHighAccuracy: false, timeout: 10_000 }`. No address fallback in v1. If denied or unavailable, the page is a permission banner with a Retry button. Reasoning: address fallback nearly doubles the integration (Autocomplete + Geocoding) for an edge case — defer until we see real demand.

## Distance computation

Haversine in `nearby.ts`. We get the user's `(lat, lng)` and each result's `(lat, lng)` from the Places response. Cheap, deterministic, no extra API call. Display in km to one decimal place.

## Auth

`<AuthGate>` like every other page. Consistency > slight friction reduction. The user is already signed in for the rest of the product; making this an exception adds branching without value.

## Error handling

| Failure | UX |
|---|---|
| User denies geolocation | Banner: "Allow location access to find places nearby. Update your browser settings and reload." |
| Geolocation timeout / unavailable | "Couldn't read your location." with Retry. |
| Maps JS fails to load | Page banner: "Couldn't load Google Maps. Check your connection and try again." |
| Places returns `OVER_QUERY_LIMIT` | Toast: "Too many requests. Please try again in a moment." |
| Places returns zero results | Empty state inside the list area: "No \[labs\|hospitals\] found within 5 km." |
| Places returns a generic error | Toast with the message; list collapses. |

## Testing

**Unit:**
- `loader.ts` — throws when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing; returns `{ apiKey, libraries }` otherwise.
- `nearby.ts` — mock the Places library; assert the request payload (`fields`, `locationRestriction`, `includedPrimaryTypes`, `maxResultCount`); assert distance is computed via Haversine and rounded; assert results are mapped to `{ id, name, address, location: { lat, lng }, distanceKm }`.

**Component:**
- `NearbyTypeFilter` — two chips render with correct labels and ARIA; click fires `onChange`; the active chip has a distinct visual.
- `NearbyList` — renders rows; "Open in Maps" link has the correct href; empty state shows when `items=[]`.

**Skipped:**
- `NearbyMap` — `@vis.gl/react-google-maps` doesn't render in jsdom without a heavy mock. Covered by manual smoke.
- E2E.

**Manual smoke:**
- Open `/nearby` in dev → grant location → map centres on you, markers appear, list populates.
- Toggle to Labs → markers and list update.
- Click "Open in Maps" → external Google Maps tab opens at the right place.
- Deny location → see the banner; Retry triggers another permission request.

## Pre-merge dependencies on Google Cloud Console

- Both **Maps JavaScript API** and **Places API (New)** must be enabled on the project the API key belongs to.
- HTTP referrer restriction on the key should include `http://localhost:3000/*` for dev (and the production URL when ready).
- API restriction should limit the key to those two APIs only.

The API key already lives in `.env.local` as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. The PR description will list these checks so the reviewer can verify.

## Out of scope (next PRs)

- Manual address input via Places Autocomplete.
- Pharmacy / urgent-care types.
- Drive/walk-time estimates (Distance Matrix API).
- Server-side rate limiting via Edge Function.
- Phase 6 — voice (STT + TTS).
- Phase 7+ — large-text mode toggle, settings polish, compliance copy.
