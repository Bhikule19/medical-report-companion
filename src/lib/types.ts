export type Language = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
];

export interface Report {
  originalText: string;
  pageCount: number | null;
  sourceLang: Language;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OcrResponse {
  original_text: string;
  translated_text: string;
  source_language: Language;
  target_language: Language;
  page_count: number | null;
}

export type ChatStreamEvent =
  | { kind: 'chunk'; text: string }
  | { kind: 'footer'; text: string }
  | { kind: 'done' }
  | { kind: 'error'; message: string };
