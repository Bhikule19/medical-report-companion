import { describe, it, expect, beforeEach } from 'vitest';
import { useReportStore } from './useReportStore';

describe('useReportStore', () => {
  beforeEach(() => useReportStore.getState().reset());

  it('defaults to language=hi and empty state', () => {
    const s = useReportStore.getState();
    expect(s.language).toBe('hi');
    expect(s.report).toBeNull();
    expect(s.summary).toBe('');
    expect(s.messages).toEqual([]);
  });

  it('setLanguage updates language', () => {
    useReportStore.getState().setLanguage('ta');
    expect(useReportStore.getState().language).toBe('ta');
  });

  it('setReport stores report and clears summary/messages', () => {
    useReportStore.setState({ summary: 'old', messages: [{ role: 'user', content: 'x' }] });
    useReportStore.getState().setReport({
      originalText: 'r',
      pageCount: 2,
      sourceLang: 'en',
    });
    const s = useReportStore.getState();
    expect(s.report?.originalText).toBe('r');
    expect(s.summary).toBe('');
    expect(s.messages).toEqual([]);
  });

  it('appendSummary concatenates', () => {
    useReportStore.getState().appendSummary('hel');
    useReportStore.getState().appendSummary('lo');
    expect(useReportStore.getState().summary).toBe('hello');
  });

  it('appendUserMessage and appendAssistantChunk build a turn', () => {
    const s = useReportStore.getState();
    s.appendUserMessage('why?');
    s.appendAssistantChunk('be');
    s.appendAssistantChunk('cause');
    expect(useReportStore.getState().messages).toEqual([
      { role: 'user', content: 'why?' },
      { role: 'assistant', content: 'because' },
    ]);
  });

  it('appendAssistantChunk appends to last assistant message if present', () => {
    const s = useReportStore.getState();
    s.appendUserMessage('q1');
    s.appendAssistantChunk('a');
    s.appendUserMessage('q2');
    s.appendAssistantChunk('b');
    s.appendAssistantChunk('c');
    expect(useReportStore.getState().messages).toEqual([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a' },
      { role: 'user', content: 'q2' },
      { role: 'assistant', content: 'bc' },
    ]);
  });
});
