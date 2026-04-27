export type Lang = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr';

export const glossary: Record<Lang, Record<string, string>> = {
  en: {
    creatinine: 'creatinine',
    haemoglobin: 'haemoglobin',
    cholesterol: 'cholesterol',
    glucose: 'glucose',
    bilirubin: 'bilirubin',
    triglycerides: 'triglycerides',
    platelets: 'platelets',
    leukocytes: 'leukocytes',
    'blood pressure': 'blood pressure',
    'thyroid stimulating hormone': 'thyroid stimulating hormone',
  },
  hi: {
    creatinine: 'क्रिएटिनिन',
    haemoglobin: 'हीमोग्लोबिन',
    cholesterol: 'कोलेस्ट्रॉल',
    glucose: 'ग्लूकोज़',
    bilirubin: 'बिलीरुबिन',
    triglycerides: 'ट्राइग्लिसराइड्स',
    platelets: 'प्लेटलेट्स',
    leukocytes: 'श्वेत रक्त कोशिकाएं',
    'blood pressure': 'रक्तचाप',
    'thyroid stimulating hormone': 'थायरॉइड उत्तेजक हार्मोन',
  },
  ta: {
    creatinine: 'கிரியேட்டினின்',
    haemoglobin: 'ஹீமோகுளோபின்',
    cholesterol: 'கொலஸ்ட்ரால்',
    glucose: 'குளுக்கோஸ்',
    bilirubin: 'பிலிரூபின்',
    triglycerides: 'ட்ரைகிளிசரைடுகள்',
    platelets: 'தட்டுச்செல்கள்',
    leukocytes: 'வெள்ளை இரத்த அணுக்கள்',
    'blood pressure': 'இரத்த அழுத்தம்',
    'thyroid stimulating hormone': 'தைராய்டு தூண்டும் ஹார்மோன்',
  },
  te: {
    creatinine: 'క్రియాటినిన్',
    haemoglobin: 'హిమోగ్లోబిన్',
    cholesterol: 'కొలెస్ట్రాల్',
    glucose: 'గ్లూకోజ్',
    bilirubin: 'బిలిరుబిన్',
    triglycerides: 'ట్రైగ్లిజరైడ్లు',
    platelets: 'ప్లేట్లెట్లు',
    leukocytes: 'ల్యూకోసైట్లు',
    'blood pressure': 'రక్తపోటు',
    'thyroid stimulating hormone': 'థైరాయిడ్ ఉత్తేజక హార్మోన్',
  },
  bn: {
    creatinine: 'ক্রিয়েটিনিন',
    haemoglobin: 'হিমোগ্লোবিন',
    cholesterol: 'কোলেস্টেরল',
    glucose: 'গ্লুকোজ',
    bilirubin: 'বিলিরুবিন',
    triglycerides: 'ট্রাইগ্লিসারাইড',
    platelets: 'প্লেটলেট',
    leukocytes: 'শ্বেত রক্তকণিকা',
    'blood pressure': 'রক্তচাপ',
    'thyroid stimulating hormone': 'থাইরয়েড উদ্দীপক হরমোন',
  },
  mr: {
    creatinine: 'क्रिएटिनिन',
    haemoglobin: 'हिमोग्लोबिन',
    cholesterol: 'कोलेस्टेरॉल',
    glucose: 'ग्लुकोज',
    bilirubin: 'बिलीरुबिन',
    triglycerides: 'ट्रायग्लिसराइड्स',
    platelets: 'प्लेटलेट्स',
    leukocytes: 'पांढऱ्या पेशी',
    'blood pressure': 'रक्तदाब',
    'thyroid stimulating hormone': 'थायरॉइड उत्तेजक संप्रेरक',
  },
};

export interface GlossaryReplacement {
  placeholder: string;
  englishKey: string;
}

export function applyGlossary(
  text: string,
  sourceLang: Lang,
): { text: string; replacements: GlossaryReplacement[] } {
  const sourceTerms = glossary[sourceLang];
  const replacements: GlossaryReplacement[] = [];
  let result = text;
  let counter = 0;
  for (const [englishKey, sourceTerm] of Object.entries(sourceTerms)) {
    const isAscii = /^[\x00-\x7F]+$/.test(sourceTerm);
    const escaped = sourceTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = isAscii
      ? `\\b${escaped}\\b`
      : `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`;
    const re = new RegExp(pattern, 'giu');
    result = result.replace(re, () => {
      const placeholder = `__GLOSS_${counter}__`;
      replacements.push({ placeholder, englishKey });
      counter += 1;
      return placeholder;
    });
  }
  return { text: result, replacements };
}

export function restoreGlossary(
  text: string,
  replacements: GlossaryReplacement[],
  targetLang: Lang,
): string {
  const target = glossary[targetLang];
  let result = text;
  for (const r of replacements) {
    const targetTerm = target[r.englishKey] ?? r.englishKey;
    result = result.split(r.placeholder).join(targetTerm);
  }
  return result;
}
