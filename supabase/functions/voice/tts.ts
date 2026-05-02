import type { Lang } from '../_shared/glossary.ts';

export interface TtsDeps {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

// Deepgram Aura voices. English uses an Aura-2 voice; for Indian languages
// Aura currently has limited coverage so we fall back to the English voice
// while the user-facing copy is translated by the LLM upstream.
// Aura is mostly English. Non-English languages fall back to the English voice
// for now — user hears English-accented audio of text in their script.
// Per-language Aura voice IDs are a polish task.
const VOICE_BY_LANG: Record<Lang, string> = {
  en: 'aura-2-thalia-en',
  hi: 'aura-2-thalia-en',
  ta: 'aura-2-thalia-en',
  te: 'aura-2-thalia-en',
  bn: 'aura-2-thalia-en',
  mr: 'aura-2-thalia-en',
  es: 'aura-2-thalia-en',
  fr: 'aura-2-thalia-en',
  de: 'aura-2-thalia-en',
  pt: 'aura-2-thalia-en',
  ru: 'aura-2-thalia-en',
  zh: 'aura-2-thalia-en',
  ar: 'aura-2-thalia-en',
  ja: 'aura-2-thalia-en',
};

export async function synthesize(
  text: string,
  language: Lang,
  deps: TtsDeps,
): Promise<{ audio: Uint8Array; mimeType: string }> {
  const fetchFn = deps.fetchImpl ?? fetch;
  const params = new URLSearchParams({
    model: VOICE_BY_LANG[language],
    encoding: 'mp3',
  });

  const res = await fetchFn(`https://api.deepgram.com/v1/speak?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${deps.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`deepgram_tts_${res.status}: ${errText.slice(0, 200)}`);
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  return { audio: buf, mimeType: 'audio/mpeg' };
}
