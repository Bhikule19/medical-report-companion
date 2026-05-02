import { POLICY_VERSION } from './versions';

const KEY = 'tos-acknowledged-version';

export function loadAck(): string | null {
  try {
    const value = localStorage.getItem(KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function saveAck(version: string): void {
  try {
    localStorage.setItem(KEY, version);
  } catch {
    // private mode or quota — best effort
  }
}

export function hasAcknowledgedCurrent(): boolean {
  return loadAck() === POLICY_VERSION;
}
