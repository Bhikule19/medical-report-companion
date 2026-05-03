import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { SpeakButton } from './SpeakButton';

export interface ChatMessageProps {
  message: ChatMessageType;
  onSpeak?: (text: string) => Promise<Blob>;
}

export function ChatMessage({ message, onSpeak }: ChatMessageProps) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="flex max-w-[85%] items-start gap-2">
        <div
          className={`whitespace-pre-wrap rounded-lg px-4 py-2 text-body-md leading-relaxed ${
            isUser
              ? 'bg-primary-container text-on-primary'
              : 'bg-surface-container-low text-on-surface'
          }`}
        >
          {message.content}
        </div>
        {!isUser && onSpeak && message.content.trim().length > 0 && (
          <SpeakButton text={message.content} onPlay={onSpeak} />
        )}
      </div>
    </div>
  );
}
