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
