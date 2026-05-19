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
      className="inline-flex gap-1.5"
    >
      {OPTIONS.map((opt) => (
        <ToggleGroup.Item
          key={opt.value}
          value={opt.value}
          className={cn(
            'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
            'border-line-2 bg-surface text-ink-2 hover:border-muted-2',
            'data-[state=on]:border-ink data-[state=on]:bg-ink data-[state=on]:text-white',
          )}
        >
          {opt.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
