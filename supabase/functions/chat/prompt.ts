import type { Lang } from '../_shared/glossary.ts';
import type { ChatMessage } from '../_shared/validate.ts';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const LANGUAGE_DIRECTIVES: Record<Lang, string> = {
  en: 'Respond in English.',
  hi: 'Respond in Hindi (हिंदी). All your output must be in Hindi.',
  ta: 'Respond in Tamil (தமிழ்). All your output must be in Tamil.',
  te: 'Respond in Telugu (తెలుగు). All your output must be in Telugu.',
  bn: 'Respond in Bengali (বাংলা). All your output must be in Bengali.',
  mr: 'Respond in Marathi (मराठी). All your output must be in Marathi.',
  es: 'Respond in Spanish (español). All your output must be in Spanish.',
  fr: 'Respond in French (français). All your output must be in French.',
  de: 'Respond in German (Deutsch). All your output must be in German.',
  pt: 'Respond in Portuguese (português). All your output must be in Portuguese.',
  ru: 'Respond in Russian (русский). All your output must be in Russian.',
  zh: 'Respond in Chinese (中文, simplified). All your output must be in Chinese.',
  ar: 'Respond in Arabic (العربية). All your output must be in Arabic.',
  ja: 'Respond in Japanese (日本語). All your output must be in Japanese.',
};

const SAFETY_RULES = [
  'You do NOT diagnose conditions.',
  'You do NOT prescribe medications, suggest dosages, or recommend specific treatments.',
  'If asked about stopping, starting, or changing any medication, refuse to give specific advice and direct the user to consult their doctor.',
  'If asked about treatment plans, surgery, or medical decisions, refuse to give specific recommendations and direct the user to consult their doctor.',
  'If asked to interpret symptoms or provide a diagnosis from symptoms, refuse and direct the user to consult a doctor.',
  'When you mention a value outside the normal range, present it factually without alarm. Suggest the user discuss it with their doctor.',
  'Do NOT make up values or details not in the report. If asked about something not in the report, say so honestly.',
  'Always end your response with a brief reminder to discuss any concerns with a qualified healthcare provider.',
]
  .map((rule, idx) => `${idx + 1}. ${rule}`)
  .join('\n');

const PLAIN_LANGUAGE_DIRECTIVE =
  'Use simple words a 12-year-old could understand. Avoid medical jargon. When you must use a medical term, briefly explain it.';

const IDENTITY = 'You explain medical reports in plain, everyday language to patients.';

const CHAT_SPECIFIC_RULE =
  "Answer the user's questions using ONLY information from the report below. If the answer is not in the report, say you don't have that information and suggest they ask their doctor.";

function buildSystemPrompt(lang: Lang, reportText: string, mode: 'summary' | 'chat'): string {
  const parts: string[] = [
    IDENTITY,
    PLAIN_LANGUAGE_DIRECTIVE,
    LANGUAGE_DIRECTIVES[lang],
    'Hard safety rules (you must follow ALL of these):',
    SAFETY_RULES,
  ];

  if (mode === 'chat') {
    parts.push(CHAT_SPECIFIC_RULE);
  }

  parts.push(`The user's medical report:\n\n${reportText}`);
  return parts.join('\n\n');
}

export function buildSummaryPrompt(lang: Lang, reportText: string): LlmMessage[] {
  return [
    { role: 'system', content: buildSystemPrompt(lang, reportText, 'summary') },
    {
      role: 'user',
      content:
        'Please give me a plain-language summary of this medical report. Highlight up to 3 values that are outside the normal range, if any. End with one suggestion to discuss with a doctor.',
    },
  ];
}

export function buildChatPrompt(
  lang: Lang,
  reportText: string,
  history: ChatMessage[],
  question: string,
): LlmMessage[] {
  return [
    { role: 'system', content: buildSystemPrompt(lang, reportText, 'chat') },
    ...history.map((m): LlmMessage => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ];
}
