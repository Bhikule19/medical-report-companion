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
            <span className="shrink-0 text-sm text-slate-500">
              {formatDistance(item.distanceKm)}
            </span>
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
