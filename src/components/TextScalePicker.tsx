'use client';

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
    <div className="flex flex-wrap gap-2" role="group" aria-label="Text size">
      {TEXT_SCALES.map((scale) => {
        const active = scale === value;
        return (
          <button
            key={scale}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) onChange(scale);
            }}
            className={`rounded-md border px-5 py-2 text-body-md font-medium transition-colors ${
              active
                ? 'border-secondary bg-secondary text-on-secondary'
                : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-outline'
            }`}
          >
            {LABELS[scale]}
          </button>
        );
      })}
    </div>
  );
}
