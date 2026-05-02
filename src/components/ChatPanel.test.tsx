import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from './ChatPanel';

describe('ChatPanel', () => {
  it('submits the question and clears the input', async () => {
    const onSend = vi.fn();
    render(<ChatPanel messages={[]} onSend={onSend} streaming={false} />);
    const input = screen.getByLabelText(/your question/i);
    await userEvent.type(input, 'why is hba1c high?');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).toHaveBeenCalledWith('why is hba1c high?', false);
    expect(input).toHaveValue('');
  });

  it('disables input and button while streaming', () => {
    render(<ChatPanel messages={[]} onSend={() => {}} streaming />);
    expect(screen.getByLabelText(/your question/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('renders user and assistant messages', () => {
    render(
      <ChatPanel
        messages={[
          { role: 'user', content: 'q' },
          { role: 'assistant', content: 'a' },
        ]}
        onSend={() => {}}
        streaming={false}
      />,
    );
    expect(screen.getByText('q')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
  });

  it('does not submit empty messages', async () => {
    const onSend = vi.fn();
    render(<ChatPanel messages={[]} onSend={onSend} streaming={false} />);
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).not.toHaveBeenCalled();
  });
});
