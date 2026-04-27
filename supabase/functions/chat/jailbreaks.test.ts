import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { containsPrescriptionPattern } from './safety.ts';

interface Jailbreak {
  id: string;
  category: string;
  prompt: string;
  unsafe_responses: string[];
}

const fixturePath = new URL(
  '../../../tests/safety/jailbreaks.json',
  import.meta.url,
);
const jailbreaks: Jailbreak[] = JSON.parse(await Deno.readTextFile(fixturePath));

// Known regex misses — jailbreaks where NO unsafe response matches our deterministic
// patterns. These are subtle/dangerous-deferral phrasings without imperative drug
// or diagnosis cues. They are caught by the LLM system prompt + Task 2.8 live
// smoke test rather than the regex post-check.
const KNOWN_REGEX_MISSES = new Set<string>([
  // (populate only if expansion can't catch without false-positives)
]);

Deno.test('jailbreak fixture loads with 30 entries across 6 categories', () => {
  assertEquals(jailbreaks.length, 30);
  const categories = new Set(jailbreaks.map((j) => j.category));
  assertEquals(categories.size, 6);
  for (const cat of ['medication', 'diagnosis', 'treatment', 'dose', 'emergency', 'injection']) {
    assert(categories.has(cat), `missing category: ${cat}`);
  }
});

Deno.test('every jailbreak has at least one unsafe response flagged by containsPrescriptionPattern', () => {
  const failures: string[] = [];
  for (const jb of jailbreaks) {
    const flaggedCount = jb.unsafe_responses.filter(containsPrescriptionPattern).length;
    if (flaggedCount === 0 && !KNOWN_REGEX_MISSES.has(jb.id)) {
      failures.push(
        `${jb.id} (${jb.category}): NONE of ${jb.unsafe_responses.length} unsafe responses flagged. Prompt: "${jb.prompt}"`,
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Safety eval: ${failures.length}/${jailbreaks.length} jailbreaks have no unsafe responses flagged.\n` +
        failures.join('\n'),
    );
  }
});

Deno.test('per-category coverage report (informational)', () => {
  const byCat: Record<string, { total: number; flaggedAll: number; flaggedSome: number }> = {};
  for (const jb of jailbreaks) {
    if (!byCat[jb.category]) byCat[jb.category] = { total: 0, flaggedAll: 0, flaggedSome: 0 };
    byCat[jb.category].total++;
    const flagged = jb.unsafe_responses.filter(containsPrescriptionPattern).length;
    if (flagged === jb.unsafe_responses.length) byCat[jb.category].flaggedAll++;
    if (flagged > 0) byCat[jb.category].flaggedSome++;
  }
  // No assertion — just print the summary
  for (const [cat, stats] of Object.entries(byCat)) {
    console.log(
      `  ${cat}: ${stats.flaggedSome}/${stats.total} jailbreaks have >=1 flag, ${stats.flaggedAll}/${stats.total} have ALL flagged`,
    );
  }
});
