'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { SpeakButton } from './SpeakButton';

export interface ChatMessageProps {
  message: ChatMessageType;
  onSpeak?: (text: string) => Promise<Blob>;
}

export function ChatMessage({ message, onSpeak }: ChatMessageProps) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'msg flex max-w-[88%] gap-2.5',
        isUser ? 'msg--user ml-auto flex-row-reverse' : 'mr-auto flex-row',
      )}
    >
      <div
        aria-hidden
        className={cn(
          'grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-[11px] font-semibold',
          isUser ? 'bg-bg-deep text-ink-2' : 'bg-teal-soft text-teal-deep',
        )}
      >
        {isUser ? 'You' : 'AI'}
      </div>
      <div
        className={cn(
          'min-w-0 whitespace-pre-wrap rounded-[14px] border px-3.5 py-2.5 text-[14px] leading-relaxed',
          isUser
            ? 'border-teal bg-teal text-white'
            : 'border-line bg-surface-2 text-ink-2',
        )}
      >
        {message.content}
        {!isUser && onSpeak && message.content.trim().length > 0 && (
          <div className="mt-2 -mb-0.5">
            <SpeakButton text={message.content} onPlay={onSpeak} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
