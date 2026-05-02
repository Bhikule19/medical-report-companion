export const TEXT_SCALES = ['standard', 'large', 'extra-large'] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export const TEXT_SCALE_VALUES: Record<TextScale, number> = {
  standard: 1.125,
  large: 1.4,
  'extra-large': 1.625,
};

const STORAGE_KEY = 'text-scale';
const DEFAULT: TextScale = 'standard';

function isTextScale(value: unknown): value is TextScale {
  return typeof value === 'string' && (TEXT_SCALES as readonly string[]).includes(value);
}

export function loadTextScale(): TextScale {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isTextScale(value) ? value : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function saveTextScale(scale: TextScale): void {
  try {
    localStorage.setItem(STORAGE_KEY, scale);
  } catch {
    // private mode or quota error — best effort
  }
}

export function applyTextScale(scale: TextScale): void {
  const value = TEXT_SCALE_VALUES[scale];
  document.documentElement.style.setProperty('--font-scale', String(value));
}
