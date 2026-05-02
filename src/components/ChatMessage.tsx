import type { ChatMessage as ChatMessageType } from '@/lib/types';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2 text-base leading-relaxed ${
          isUser ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
