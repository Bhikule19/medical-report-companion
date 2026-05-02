import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

export const langSchema = z.enum([
  'en', 'hi', 'ta', 'te', 'bn', 'mr',
  'es', 'fr', 'de', 'pt', 'ru', 'zh', 'ar', 'ja',
]);

export const ocrRequestSchema = z.object({
  target_language: langSchema,
});

export type OcrRequest = z.infer<typeof ocrRequestSchema>;

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

export const chatRequestSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('summary'),
    report_text: z.string().min(1),
    target_language: langSchema,
    history: z.array(messageSchema).optional().default([]),
  }),
  z.object({
    mode: z.literal('chat'),
    report_text: z.string().min(1),
    target_language: langSchema,
    history: z.array(messageSchema).optional().default([]),
    question: z.string().min(1),
  }),
]);

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatMessage = z.infer<typeof messageSchema>;
