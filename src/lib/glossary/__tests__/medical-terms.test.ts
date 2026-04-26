import { describe, it, expect } from 'vitest';
import { glossary, applyGlossary, restoreGlossary } from '../medical-terms';

describe('glossary', () => {
  it('has entries for all 6 languages', () => {
    const langs = ['en', 'hi', 'ta', 'te', 'bn', 'mr'] as const;
    for (const l of langs) expect(glossary[l]).toBeDefined();
  });

  it('replaces medical terms with placeholders before translation', () => {
    const { text, replacements } = applyGlossary('Creatinine is high', 'en');
    expect(text).toMatch(/__GLOSS_\d+__/);
    expect(replacements.length).toBeGreaterThan(0);
  });

  it('restores placeholders to target language terms after translation', () => {
    const { text, replacements } = applyGlossary('Creatinine is high', 'en');
    const translated = text.replace('is high', 'अधिक है');
    const restored = restoreGlossary(translated, replacements, 'hi');
    expect(restored).toContain('क्रिएटिनिन');
  });
});
