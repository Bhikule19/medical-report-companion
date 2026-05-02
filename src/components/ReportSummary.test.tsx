import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportSummary } from './ReportSummary';

describe('ReportSummary', () => {
  it('renders summary text and metadata', () => {
    render(
      <ReportSummary
        summary="Plain language summary."
        pageCount={3}
        sourceLang="en"
        streaming={false}
      />,
    );
    expect(screen.getByText(/plain language summary/i)).toBeInTheDocument();
    expect(screen.getByText(/3 pages/i)).toBeInTheDocument();
    expect(screen.getByText(/source: english/i)).toBeInTheDocument();
  });

  it('renders a streaming indicator while streaming', () => {
    render(<ReportSummary summary="partial" pageCount={null} sourceLang="en" streaming />);
    expect(screen.getByLabelText(/generating summary/i)).toBeInTheDocument();
  });
});
