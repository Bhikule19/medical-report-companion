import { create } from 'zustand';
import type { ChatMessage, Language, Report } from '@/lib/types';
import type { ReportSummaryRow } from '@/lib/db/reports';
import { DEFAULT_CONSENTS, type ConsentValues } from '@/lib/db/consents';

interface ReportState {
  language: Language;
  report: Report | null;
  summary: string;
  summaryStreaming: boolean;
  messages: ChatMessage[];
  chatStreaming: boolean;
  historyList: ReportSummaryRow[];
  consents: ConsentValues;

  setLanguage: (lang: Language) => void;
  setReport: (report: Report) => void;
  appendSummary: (chunk: string) => void;
  setSummaryStreaming: (streaming: boolean) => void;
  appendUserMessage: (content: string) => void;
  appendAssistantChunk: (chunk: string) => void;
  setChatStreaming: (streaming: boolean) => void;
  setHistoryList: (list: ReportSummaryRow[]) => void;
  loadReport: (
    report: Report,
    messages: { role: 'user' | 'assistant'; content: string }[],
  ) => void;
  clearReport: () => void;
  setConsents: (values: ConsentValues) => void;
  reset: () => void;
}

const initial = {
  language: 'hi' as Language,
  report: null,
  summary: '',
  summaryStreaming: false,
  messages: [] as ChatMessage[],
  chatStreaming: false,
  historyList: [] as ReportSummaryRow[],
  consents: DEFAULT_CONSENTS,
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
  setHistoryList: (historyList) => set({ historyList }),
  loadReport: (report, messages) => {
    const [first, ...rest] = messages;
    const summary = first?.role === 'assistant' ? first.content : '';
    const remaining = first?.role === 'assistant' ? rest : messages;
    set({ report, summary, messages: remaining });
  },
  clearReport: () => set({ report: null, summary: '', messages: [] }),
  setConsents: (consents) => set({ consents }),
  reset: () => set(initial),
}));
