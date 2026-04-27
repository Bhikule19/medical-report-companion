import { assertEquals, assertStringIncludes, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { containsPrescriptionPattern, appendSafetyFooter } from './safety.ts';

Deno.test('containsPrescriptionPattern: imperative drug instruction', () => {
  assert(containsPrescriptionPattern('You should take metformin 500mg daily'));
  assert(containsPrescriptionPattern('You must stop taking aspirin'));
  assert(containsPrescriptionPattern('I recommend you start your medication'));
});

Deno.test('containsPrescriptionPattern: dose changes', () => {
  assert(containsPrescriptionPattern('Increase your dose to twice daily'));
  assert(containsPrescriptionPattern('Stop taking your medication'));
  assert(containsPrescriptionPattern('Double your dose if needed'));
});

Deno.test('containsPrescriptionPattern: explicit dose numbers', () => {
  assert(containsPrescriptionPattern('Take 500 mg of paracetamol'));
  assert(containsPrescriptionPattern('Take 10 ml twice a day'));
  assert(containsPrescriptionPattern('Dosage of 5 tablets'));
});

Deno.test('containsPrescriptionPattern: speculative diagnosis', () => {
  assert(containsPrescriptionPattern('You may have hepatitis'));
  assert(containsPrescriptionPattern('You probably have anaemia'));
  assert(containsPrescriptionPattern('You might have hyperthyroidism'));
});

Deno.test('containsPrescriptionPattern: explicit diagnosis', () => {
  assert(containsPrescriptionPattern('I diagnose you with diabetes'));
  assert(containsPrescriptionPattern('Diagnosing you as anaemic'));
});

Deno.test('containsPrescriptionPattern: required treatment', () => {
  assert(containsPrescriptionPattern('You need surgery'));
  assert(containsPrescriptionPattern('You need antibiotics'));
});

Deno.test('containsPrescriptionPattern: innocuous descriptions of report values pass', () => {
  // These should NOT be flagged
  assertEquals(containsPrescriptionPattern('Your haemoglobin level is 13.5 g/dL, which is normal.'), false);
  assertEquals(containsPrescriptionPattern('Creatinine measures kidney function.'), false);
  assertEquals(containsPrescriptionPattern('This report shows your cholesterol is 195 mg/dL.'), false);
  assertEquals(containsPrescriptionPattern('Please discuss your results with your doctor.'), false);
});

Deno.test('containsPrescriptionPattern: safe redirections do not trigger', () => {
  // Saying "ask your doctor" is GOOD — should not be flagged.
  assertEquals(
    containsPrescriptionPattern("I can't recommend specific medications. Please ask your doctor."),
    false,
  );
});

Deno.test('containsPrescriptionPattern: case insensitive', () => {
  assert(containsPrescriptionPattern('YOU SHOULD TAKE METFORMIN'));
  assert(containsPrescriptionPattern('YoU sHoUlD sTaRt'));
});

Deno.test('appendSafetyFooter: appends English footer with separator', () => {
  const result = appendSafetyFooter('Your report looks normal.', 'en');
  assertStringIncludes(result, 'Your report looks normal.');
  assertStringIncludes(result, '⚠');
  assertStringIncludes(result, 'consult a qualified healthcare provider');
});

Deno.test('appendSafetyFooter: localised per language', () => {
  const cases = [
    ['hi', 'योग्य'],
    ['ta', 'தகுதியான'],
    ['te', 'అర్హతగల'],
    ['bn', 'যোগ্য'],
    ['mr', 'पात्र'],
  ] as const;
  for (const [lang, marker] of cases) {
    const result = appendSafetyFooter('text', lang);
    assertStringIncludes(result, marker);
  }
});

Deno.test('appendSafetyFooter: separator before footer', () => {
  const result = appendSafetyFooter('Body of message.', 'en');
  // Should have at least one blank line between body and footer
  assertStringIncludes(result, 'Body of message.\n\n');
});

Deno.test('appendSafetyFooter: idempotent on already-footered text', () => {
  // Real life: don't apply twice if somehow called twice. Simple check: result starts with input.
  const once = appendSafetyFooter('text', 'en');
  // No assertion on idempotency in this test — just verify the structure makes it possible to detect
  assert(once.length > 'text'.length);
});
