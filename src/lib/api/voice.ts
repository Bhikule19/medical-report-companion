import type { Language } from '../types';
import type { SupabaseConfig } from '../env';

export class VoiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'VoiceError';
  }
}

export interface TranscribeInput {
  blob: Blob;
  language: Language;
  accessToken: string;
  config: SupabaseConfig;
  fetchImpl?: typeof fetch;
}

export async function transcribeAudio(input: TranscribeInput): Promise<{ transcript: string }> {
  const fetchFn = input.fetchImpl ?? fetch;
  const form = new FormData();
  form.append('audio', input.blob, 'recording');
  form.append('language', input.language);

  const res = await fetchFn(`${input.config.url}/functions/v1/voice`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      apikey: input.config.anonKey,
    },
    body: form,
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new VoiceError(
      typeof body?.error === 'string' ? body.error : `voice_failed_${res.status}`,
      res.status,
    );
  }

  return (await res.json()) as { transcript: string };
}

export interface SynthesizeInput {
  text: string;
  language: Language;
  accessToken: string;
  config: SupabaseConfig;
  fetchImpl?: typeof fetch;
}

export async function synthesizeSpeech(input: SynthesizeInput): Promise<Blob> {
  const fetchFn = input.fetchImpl ?? fetch;
  const res = await fetchFn(`${input.config.url}/functions/v1/voice`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      apikey: input.config.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: input.text, language: input.language }),
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new VoiceError(
      typeof body?.error === 'string' ? body.error : `voice_failed_${res.status}`,
      res.status,
    );
  }

  return await res.blob();
}

async function safeJson(res: Response): Promise<{ error?: unknown } | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
