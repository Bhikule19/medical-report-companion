import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistorySidebar } from './HistorySidebar';

describe('HistorySidebar', () => {
  it('renders empty state when no items', () => {
    render(
      <HistorySidebar
        items={[]}
        activeId={null}
        onSelect={() => {}}
        onNew={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
  });

  it('renders one item per row, falling back to "Report from <date>" when title is null', () => {
    render(
      <HistorySidebar
        items={[
          { id: 'r-1', title: 'CBC', created_at: '2026-05-01T00:00:00Z', target_lang: 'hi' },
          { id: 'r-2', title: null, created_at: '2026-05-02T00:00:00Z', target_lang: 'en' },
        ]}
        activeId={null}
        onSelect={() => {}}
        onNew={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByText('CBC')).toBeInTheDocument();
    expect(screen.getByText(/report from/i)).toBeInTheDocument();
  });

  it('calls onSelect with id on click', async () => {
    const onSelect = vi.fn();
    render(
      <HistorySidebar
        items={[{ id: 'r-1', title: 'CBC', created_at: '2026-05-01T00:00:00Z', target_lang: 'hi' }]}
        activeId={null}
        onSelect={onSelect}
        onNew={() => {}}
        disabled={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /CBC/ }));
    expect(onSelect).toHaveBeenCalledWith('r-1');
  });

  it('calls onNew when "New report" clicked', async () => {
    const onNew = vi.fn();
    render(
      <HistorySidebar
        items={[]}
        activeId={null}
        onSelect={() => {}}
        onNew={onNew}
        disabled={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /new report/i }));
    expect(onNew).toHaveBeenCalled();
  });

  it('disables all buttons when disabled=true', () => {
    render(
      <HistorySidebar
        items={[{ id: 'r-1', title: 'CBC', created_at: '2026-05-01T00:00:00Z', target_lang: 'hi' }]}
        activeId={null}
        onSelect={() => {}}
        onNew={() => {}}
        disabled
      />,
    );
    expect(screen.getByRole('button', { name: /new report/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /CBC/ })).toBeDisabled();
  });

  it('renders a delete button when onDelete prop is provided', () => {
    render(
      <HistorySidebar
        items={[{ id: 'r-1', title: 'CBC', created_at: '2026-05-01T00:00:00Z', target_lang: 'hi' }]}
        activeId={null}
        onSelect={() => {}}
        onNew={() => {}}
        onDelete={async () => {}}
        disabled={false}
      />,
    );
    expect(screen.getByRole('button', { name: /delete report/i })).toBeInTheDocument();
  });

  it('does not render delete button when onDelete is omitted', () => {
    render(
      <HistorySidebar
        items={[{ id: 'r-1', title: 'CBC', created_at: '2026-05-01T00:00:00Z', target_lang: 'hi' }]}
        activeId={null}
        onSelect={() => {}}
        onNew={() => {}}
        disabled={false}
      />,
    );
    expect(screen.queryByRole('button', { name: /delete report/i })).not.toBeInTheDocument();
  });
});
