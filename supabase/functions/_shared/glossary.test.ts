import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { glossary, applyGlossary, restoreGlossary } from './glossary.ts';

Deno.test('has entries for all 6 languages', () => {
  const langs = ['en', 'hi', 'ta', 'te', 'bn', 'mr'] as const;
  for (const l of langs) assert(glossary[l] !== undefined);
});

Deno.test('replaces medical terms with placeholders before translation', () => {
  const { text, replacements } = applyGlossary('Creatinine is high', 'en');
  assertEquals(/__GLOSS_\d+__/.test(text), true);
  assert(replacements.length > 0);
});

Deno.test('restores placeholders to target language terms after translation', () => {
  const { text, replacements } = applyGlossary('Creatinine is high', 'en');
  const translated = text.replace('is high', 'अधिक है');
  const restored = restoreGlossary(translated, replacements, 'hi');
  assert(restored.includes('क्रिएटिनिन'));
});
