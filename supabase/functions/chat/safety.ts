import type { Lang } from '../_shared/glossary.ts';

const PATTERNS: RegExp[] = [
  // Imperative drug/treatment instructions
  /\b(you should|you must|i recommend|please) (take|start taking|stop taking|start|stop|increase|decrease|double|skip|begin)\b/i,
  // Dose changes
  /\b(start|stop|skip|increase|decrease|double|halve|continue) (taking|the dose|your dose|your medication)\b/i,
  // Explicit dose numbers
  /\btake \d+\s*(mg|ml|drops|capsules|tablets|pills|units?)\b/i,
  /\bdosage of \d/i,
  // Speculative diagnosis with disease-suffix nouns
  /\byou (probably|likely|may|might) have \w*(itis|emia|ism|osis|opathy|cancer|disease|syndrome|disorder|aemia)\b/i,
  // Speculative diagnosis with named conditions
  /\byou (probably|likely|may|might) have (diabetes|hypertension|cancer|tumou?r|infection|deficiency|stroke|heart attack|kidney failure|liver failure)\b/i,
  // Explicit diagnosis claims
  /\b(diagnose|diagnosing) you\b/i,
  // Required treatment
  /\byou need (a |an |the )?(surgery|chemotherapy|radiation|antibiotics|insulin|chemo|dialysis|transfusion|blood transfusion)\b/i,
];

export function containsPrescriptionPattern(text: string): boolean {
  return PATTERNS.some((p) => p.test(text));
}

const FOOTERS: Record<Lang, string> = {
  en: '⚠ This response may contain medical advice. Please consult a qualified healthcare provider before acting on it.',
  hi: '⚠ इस उत्तर में चिकित्सा सलाह हो सकती है। कार्य करने से पहले कृपया योग्य स्वास्थ्य सेवा प्रदाता से परामर्श करें।',
  ta: '⚠ இந்த பதிலில் மருத்துவ ஆலோசனை இருக்கலாம். செயல்படுவதற்கு முன் தகுதியான சுகாதார நிபுணரை அணுகவும்.',
  te: '⚠ ఈ ప్రతిస్పందనలో వైద్య సలహా ఉండవచ్చు. చర్య తీసుకునే ముందు అర్హతగల ఆరోగ్య సంరక్షణ ప్రదాతను సంప్రదించండి.',
  bn: '⚠ এই উত্তরে চিকিৎসা পরামর্শ থাকতে পারে। কাজ করার আগে একজন যোগ্য স্বাস্থ্যসেবা প্রদানকারীর সাথে পরামর্শ করুন।',
  mr: '⚠ या उत्तरात वैद्यकीय सल्ला असू शकतो. कृती करण्यापूर्वी कृपया पात्र आरोग्य सेवा प्रदात्याशी सल्लामसलत करा.',
};

export function getSafetyFooter(lang: Lang): string {
  return FOOTERS[lang];
}

export function appendSafetyFooter(text: string, lang: Lang): string {
  return `${text}\n\n${FOOTERS[lang]}`;
}
