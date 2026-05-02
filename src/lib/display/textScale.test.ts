import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TEXT_SCALES,
  TEXT_SCALE_VALUES,
  loadTextScale,
  saveTextScale,
  applyTextScale,
  type TextScale,
} from './textScale';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty('--font-scale');
});

describe('TEXT_SCALE_VALUES', () => {
  it('maps each option to a numeric multiplier', () => {
    expect(TEXT_SCALE_VALUES.standard).toBe(1.125);
    expect(TEXT_SCALE_VALUES.large).toBe(1.4);
    expect(TEXT_SCALE_VALUES['extra-large']).toBe(1.625);
  });

  it('TEXT_SCALES contains all three options', () => {
    expect(TEXT_SCALES).toEqual(['standard', 'large', 'extra-large']);
  });
});

describe('loadTextScale', () => {
  it('returns "standard" when nothing is stored', () => {
    expect(loadTextScale()).toBe('standard');
  });

  it('returns the stored value when valid', () => {
    localStorage.setItem('text-scale', 'large');
    expect(loadTextScale()).toBe('large');
  });

  it('returns "standard" when stored value is invalid', () => {
    localStorage.setItem('text-scale', 'huge');
    expect(loadTextScale()).toBe('standard');
  });

  it('returns "standard" when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadTextScale()).toBe('standard');
    spy.mockRestore();
  });
});

describe('saveTextScale', () => {
  it('writes the value to localStorage at the right key', () => {
    saveTextScale('large');
    expect(localStorage.getItem('text-scale')).toBe('large');
  });

  it('does not throw when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveTextScale('large' as TextScale)).not.toThrow();
    spy.mockRestore();
  });
});

describe('applyTextScale', () => {
  it('sets --font-scale on the document root', () => {
    applyTextScale('large');
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.4');
  });

  it('updates --font-scale when called again', () => {
    applyTextScale('large');
    applyTextScale('extra-large');
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.625');
  });
});
