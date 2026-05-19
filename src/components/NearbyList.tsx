'use client';

import { MapPin, Navigation } from 'lucide-react';
import type { NearbyPlace } from '@/lib/places/nearby';
import { cn } from '@/lib/utils';

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
  activeId?: string | null;
  onSelect?: (id: string) => void;
}

export function NearbyList({ items, activeId, onSelect }: NearbyListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-8 text-center text-[13px] text-muted">
        No places found within 5 km. Try the other category.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <li key={item.id}>
            <article
              className={cn(
                'rounded-md border border-line bg-surface p-3.5 transition-all',
                isActive
                  ? 'border-teal shadow-sm ring-2 ring-teal-soft'
                  : 'hover:border-teal-tint hover:shadow-sm',
              )}
            >
              <button
                type="button"
                onClick={() => onSelect?.(item.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14px] font-semibold tracking-[-0.005em]">
                    {item.name}
                  </h3>
                  <p className="mt-1 flex items-start gap-1.5 text-[12px] text-muted">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                    <span className="line-clamp-2">{item.address}</span>
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-teal-soft px-2 py-0.5 text-[11px] font-medium text-teal-deep">
                  <Navigation className="h-3 w-3" aria-hidden />
                  {formatDistance(item.distanceKm)}
                </span>
              </button>

              <div className="mt-3 flex gap-1.5 border-t border-dashed border-line pt-3">
                <a
                  href={buildMapsUrl(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-line-2 bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:bg-surface-2"
                >
                  Open in Maps
                </a>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
