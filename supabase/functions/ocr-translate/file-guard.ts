const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export type GuardResult = { ok: true } | { ok: false; error: string };

export function validateFile(meta: { size: number; type: string }): GuardResult {
  if (meta.size > MAX_BYTES) return { ok: false, error: 'file_too_large' };
  if (!ALLOWED.has(meta.type)) return { ok: false, error: 'unsupported_type' };
  return { ok: true };
}
