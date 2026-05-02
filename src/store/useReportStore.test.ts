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
      id: 'r-1',
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

describe('useReportStore — history additions', () => {
  beforeEach(() => useReportStore.getState().reset());

  it('setHistoryList replaces the historyList', () => {
    useReportStore.getState().setHistoryList([
      { id: 'r-1', title: 'A', created_at: '1', target_lang: 'hi' },
    ]);
    expect(useReportStore.getState().historyList).toHaveLength(1);
  });

  it('loadReport hydrates report, summary, and remaining messages', () => {
    useReportStore.getState().loadReport(
      {
        id: 'r-1',
        originalText: 'orig',
        pageCount: 2,
        sourceLang: 'en',
      },
      [
        { role: 'assistant', content: 'summary text' },
        { role: 'user', content: 'q' },
        { role: 'assistant', content: 'a' },
      ],
    );
    const s = useReportStore.getState();
    expect(s.report?.id).toBe('r-1');
    expect(s.summary).toBe('summary text');
    expect(s.messages).toEqual([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'a' },
    ]);
  });

  it('loadReport with empty messages leaves summary as empty string', () => {
    useReportStore.getState().loadReport(
      { id: 'r-1', originalText: 'o', pageCount: null, sourceLang: 'en' },
      [],
    );
    expect(useReportStore.getState().summary).toBe('');
    expect(useReportStore.getState().messages).toEqual([]);
  });

  it('clearReport removes report, summary, messages but keeps historyList', () => {
    useReportStore.setState({
      report: { id: 'r-1', originalText: 'o', pageCount: null, sourceLang: 'en' },
      summary: 's',
      messages: [{ role: 'user', content: 'q' }],
      historyList: [{ id: 'r-1', title: 'A', created_at: '1', target_lang: 'hi' }],
    });
    useReportStore.getState().clearReport();
    const s = useReportStore.getState();
    expect(s.report).toBeNull();
    expect(s.summary).toBe('');
    expect(s.messages).toEqual([]);
    expect(s.historyList).toHaveLength(1);
  });
});
