import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

export const langSchema = z.enum(['en', 'hi', 'ta', 'te', 'bn', 'mr']);

export const ocrRequestSchema = z.object({
  target_language: langSchema,
});

export type OcrRequest = z.infer<typeof ocrRequestSchema>;
