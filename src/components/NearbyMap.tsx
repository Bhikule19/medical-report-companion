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
