import type { Lang } from '../_shared/glossary.ts';

const SUPPORTED: ReadonlySet<Lang> = new Set(['en', 'hi', 'ta', 'te', 'bn', 'mr']);

export async function detectLanguage(
  text: string,
  deps: { apiKey: string; fetchImpl?: typeof fetch },
): Promise<Lang> {
  const f = deps.fetchImpl ?? fetch;
  const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${deps.apiKey}`;
  try {
    const res = await f(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: [text.slice(0, 500)] }),
    });
    if (!res.ok) return 'en';
    const json = await res.json();
    const code = json?.data?.detections?.[0]?.[0]?.language;
    return SUPPORTED.has(code) ? (code as Lang) : 'en';
  } catch {
    return 'en';
  }
}
