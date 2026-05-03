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
    return (
      <p className="text-body-md text-on-surface-variant">
        No places found within 5 km.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-card transition-shadow hover:shadow-card-hover"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-body-lg font-medium text-on-surface">{item.name}</h3>
              <p className="text-body-md text-on-surface-variant">{item.address}</p>
            </div>
            <span className="shrink-0 text-label-caps uppercase tracking-wider text-on-surface-variant">
              {formatDistance(item.distanceKm)}
            </span>
          </div>
          <a
            href={buildMapsUrl(item)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-body-md text-secondary underline transition-colors hover:text-secondary-container"
          >
            Open in Maps
          </a>
        </li>
      ))}
    </ul>
  );
}
