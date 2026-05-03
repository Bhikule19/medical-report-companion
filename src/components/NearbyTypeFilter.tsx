'use client';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils';
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
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as NearbyType);
      }}
      aria-label="Place type filter"
      className="inline-flex gap-2"
    >
      {OPTIONS.map((opt) => (
        <ToggleGroup.Item
          key={opt.value}
          value={opt.value}
          className={cn(
            'rounded-full border px-5 py-2 text-body-md font-medium transition-all',
            'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-outline',
            'data-[state=on]:border-primary-container data-[state=on]:bg-primary-container data-[state=on]:text-on-primary data-[state=on]:shadow-card',
          )}
        >
          {opt.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
