import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAck, saveAck, hasAcknowledgedCurrent } from './acknowledge';
import { POLICY_VERSION } from './versions';

beforeEach(() => {
  localStorage.clear();
});

describe('loadAck', () => {
  it('returns null when key missing', () => {
    expect(loadAck()).toBeNull();
  });

  it('returns the stored version', () => {
    localStorage.setItem('tos-acknowledged-version', '2025-01-01');
    expect(loadAck()).toBe('2025-01-01');
  });

  it('returns null when stored value is empty', () => {
    localStorage.setItem('tos-acknowledged-version', '');
    expect(loadAck()).toBeNull();
  });

  it('returns null when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadAck()).toBeNull();
    spy.mockRestore();
  });
});

describe('saveAck', () => {
  it('writes the version to localStorage', () => {
    saveAck('2026-05-02');
    expect(localStorage.getItem('tos-acknowledged-version')).toBe('2026-05-02');
  });

  it('does not throw when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveAck('2026-05-02')).not.toThrow();
    spy.mockRestore();
  });
});

describe('hasAcknowledgedCurrent', () => {
  it('returns false when nothing stored', () => {
    expect(hasAcknowledgedCurrent()).toBe(false);
  });

  it('returns true when stored version equals POLICY_VERSION', () => {
    saveAck(POLICY_VERSION);
    expect(hasAcknowledgedCurrent()).toBe(true);
  });

  it('returns false when stored version is older', () => {
    saveAck('2025-01-01');
    expect(hasAcknowledgedCurrent()).toBe(false);
  });
});
