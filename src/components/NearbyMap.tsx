'use client';

import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { NearbyPlace } from '@/lib/places/nearby';

export interface NearbyMapProps {
  centre: { lat: number; lng: number };
  items: NearbyPlace[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

export function NearbyMap({ centre, items, activeId, onSelect, className }: NearbyMapProps) {
  return (
    <div
      className={
        className ??
        'relative h-full min-h-[540px] w-full overflow-hidden rounded-lg border border-line-2 bg-[#dfeaf0]'
      }
    >
      <Map
        mapId="medical-report-companion-nearby"
        defaultCenter={centre}
        defaultZoom={14}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        <AdvancedMarker position={centre}>
          <Pin background="#2563eb" borderColor="#1e3a8a" glyphColor="#ffffff" />
        </AdvancedMarker>
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <AdvancedMarker
              key={item.id}
              position={item.location}
              onClick={() => onSelect?.(item.id)}
            >
              <Pin
                background={isActive ? '#0b1f2a' : '#0e7c7b'}
                borderColor="#ffffff"
                glyphColor="#ffffff"
                scale={isActive ? 1.25 : 1}
              />
            </AdvancedMarker>
          );
        })}
      </Map>

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-3.5 left-3.5 flex items-center gap-3.5 rounded-md border border-line bg-white/95 px-3 py-2 text-[11px] text-muted shadow-sm backdrop-blur"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal" />
          Result
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue" />
          You
        </span>
      </div>
    </div>
  );
}
