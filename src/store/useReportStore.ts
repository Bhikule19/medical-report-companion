import { create } from 'zustand';
import type { ChatMessage, Language, Report } from '@/lib/types';

interface ReportState {
  language: Language;
  report: Report | null;
  summary: string;
  summaryStreaming: boolean;
  messages: ChatMessage[];
  chatStreaming: boolean;

  setLanguage: (lang: Language) => void;
  setReport: (report: Report) => void;
  appendSummary: (chunk: string) => void;
  setSummaryStreaming: (streaming: boolean) => void;
  appendUserMessage: (content: string) => void;
  appendAssistantChunk: (chunk: string) => void;
  setChatStreaming: (streaming: boolean) => void;
  reset: () => void;
}

const initial = {
  language: 'hi' as Language,
  report: null,
  summary: '',
  summaryStreaming: false,
  messages: [] as ChatMessage[],
  chatStreaming: false,
};

export const useReportStore = create<ReportState>((set) => ({
  ...initial,
  setLanguage: (language) => set({ language }),
  setReport: (report) => set({ report, summary: '', messages: [] }),
  appendSummary: (chunk) => set((s) => ({ summary: s.summary + chunk })),
  setSummaryStreaming: (summaryStreaming) => set({ summaryStreaming }),
  appendUserMessage: (content) =>
    set((s) => ({ messages: [...s.messages, { role: 'user', content }] })),
  appendAssistantChunk: (chunk) =>
    set((s) => {
      const last = s.messages[s.messages.length - 1];
      if (last && last.role === 'assistant') {
        const updated = [...s.messages];
        updated[updated.length - 1] = { ...last, content: last.content + chunk };
        return { messages: updated };
      }
      return { messages: [...s.messages, { role: 'assistant', content: chunk }] };
    }),
  setChatStreaming: (chatStreaming) => set({ chatStreaming }),
  reset: () => set(initial),
}));
