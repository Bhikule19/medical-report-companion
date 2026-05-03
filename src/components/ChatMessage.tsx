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
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div className="flex max-w-[85%] items-start gap-2">
        <div
          className={cn(
            'whitespace-pre-wrap rounded-lg px-4 py-2.5 text-body-md leading-relaxed shadow-card',
            isUser
              ? 'bg-primary-container text-on-primary'
              : 'bg-surface-container-low text-on-surface',
          )}
        >
          {message.content}
        </div>
        {!isUser && onSpeak && message.content.trim().length > 0 && (
          <SpeakButton text={message.content} onPlay={onSpeak} />
        )}
      </div>
    </motion.div>
  );
}
