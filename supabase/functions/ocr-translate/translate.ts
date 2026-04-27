import { applyGlossary, restoreGlossary, type Lang } from '../_shared/glossary.ts';

export interface TranslateDeps {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export async function translateWithGlossary(
  text: string,
  source: Lang,
  target: Lang,
  deps: TranslateDeps,
): Promise<string> {
  if (source === target) return text;
  const f = deps.fetchImpl ?? fetch;
  const { text: protectedText, replacements } = applyGlossary(text, source);
  const url = `https://translation.googleapis.com/language/translate/v2?key=${deps.apiKey}`;
  const res = await f(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: [protectedText], source, target, format: 'text' }),
  });
  if (!res.ok) throw new Error(`translate_failed: ${res.status}`);
  const json = await res.json();
  const translated = json.data.translations[0].translatedText as string;
  return restoreGlossary(translated, replacements, target);
}
