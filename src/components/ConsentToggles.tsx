'use client';

import type { ConsentValues } from '@/lib/db/consents';

interface Toggle {
  key: keyof ConsentValues;
  label: string;
  description: string;
}

const TOGGLES: Toggle[] = [
  {
    key: 'store_reports',
    label: 'Save reports to your history',
    description:
      'When off, uploaded reports stay only in your current browser tab. Closing the tab loses them.',
  },
  {
    key: 'store_chat',
    label: 'Save chat history',
    description:
      "When off, your questions and the assistant's replies are not saved. Summaries still are.",
  },
  {
    key: 'store_voice_transcripts',
    label: 'Save voice transcripts',
    description:
      'When off, anything you say (after voice is enabled) will not be transcribed or saved.',
  },
];

export interface ConsentTogglesProps {
  values: ConsentValues;
  disabled: boolean;
  onChange: (key: keyof ConsentValues, next: boolean) => void;
}

export function ConsentToggles({ values, disabled, onChange }: ConsentTogglesProps) {
  return (
    <div className="flex flex-col gap-5">
      {TOGGLES.map((t) => (
        <label
          key={t.key}
          className="flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors hover:bg-surface-container-low"
        >
          <input
            type="checkbox"
            checked={values[t.key]}
            disabled={disabled}
            onChange={(e) => onChange(t.key, e.target.checked)}
            className="mt-1 h-5 w-5 cursor-pointer rounded border-outline-variant accent-secondary disabled:opacity-50"
          />
          <span className="flex flex-col gap-1">
            <span className="text-body-md font-medium text-on-surface">{t.label}</span>
            <span className="text-body-md text-on-surface-variant">{t.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
