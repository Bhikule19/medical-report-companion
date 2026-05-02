import type { Language, OcrResponse } from '../types';
import type { SupabaseConfig } from '../env';

export interface OcrTranslateInput {
  file: File;
  targetLang: Language;
  config: SupabaseConfig;
  fetchImpl?: typeof fetch;
}

export class OcrError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'OcrError';
  }
}

export async function ocrTranslate(input: OcrTranslateInput): Promise<OcrResponse> {
  const fetchFn = input.fetchImpl ?? fetch;
  const form = new FormData();
  form.append('file', input.file);
  form.append('target_language', input.targetLang);

  const res = await fetchFn(`${input.config.url}/functions/v1/ocr-translate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.config.anonKey}`,
      apikey: input.config.anonKey,
    },
    body: form,
  });

  if (!res.ok) {
    const retryAfter = res.headers.get('Retry-After');
    const body = await safeJson(res);
    throw new OcrError(
      typeof body?.error === 'string' ? body.error : `ocr_failed_${res.status}`,
      res.status,
      retryAfter ? Number(retryAfter) : null,
    );
  }

  return (await res.json()) as OcrResponse;
}

async function safeJson(res: Response): Promise<{ error?: unknown } | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
