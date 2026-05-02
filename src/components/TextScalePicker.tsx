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
            className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'border-slate-700 bg-slate-800 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
            }`}
          >
            {LABELS[scale]}
          </button>
        );
      })}
    </div>
  );
}
