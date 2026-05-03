'use client';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils';
import { TEXT_SCALES, type TextScale } from '@/lib/display/textScale';

const LABELS: Record<TextScale, string> = {
  standard: 'Standard',
  large: 'Large',
  'extra-large': 'Extra-large',
};

export interface TextScalePickerProps {
  value: TextScale;
  onChange: (next: TextScale) => void;
}

export function TextScalePicker({ value, onChange }: TextScalePickerProps) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as TextScale);
      }}
      aria-label="Text size"
      className="inline-flex flex-wrap gap-2"
    >
      {TEXT_SCALES.map((scale) => (
        <ToggleGroup.Item
          key={scale}
          value={scale}
          className={cn(
            'rounded-md border px-5 py-2 text-body-md font-medium transition-all',
            'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-outline',
            'data-[state=on]:border-secondary data-[state=on]:bg-secondary data-[state=on]:text-on-secondary data-[state=on]:shadow-card',
          )}
        >
          {LABELS[scale]}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
