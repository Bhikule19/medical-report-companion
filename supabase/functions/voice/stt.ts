import type { Lang } from '../_shared/glossary.ts';

export interface SttDeps {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

const LANG_TO_DEEPGRAM: Record<Lang, string> = {
  en: 'en-IN',
  hi: 'hi',
  ta: 'ta',
  te: 'te',
  bn: 'bn',
  mr: 'mr',
  es: 'es',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  ru: 'ru',
  zh: 'zh',
  ar: 'ar',
  ja: 'ja',
};

export interface SttResult {
  transcript: string;
}

export async function transcribe(
  audio: Uint8Array,
  mimeType: string,
  language: Lang,
  deps: SttDeps,
): Promise<SttResult> {
  const fetchFn = deps.fetchImpl ?? fetch;
  const params = new URLSearchParams({
    model: 'nova-3',
    language: LANG_TO_DEEPGRAM[language],
    smart_format: 'true',
    punctuate: 'true',
  });

  const res = await fetchFn(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${deps.apiKey}`,
      'Content-Type': mimeType || 'audio/webm',
    },
    body: audio,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`deepgram_stt_${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const transcript: string =
    json?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
  return { transcript };
}
