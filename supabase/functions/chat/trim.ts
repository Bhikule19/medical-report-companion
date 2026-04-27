import type { ChatMessage } from '../_shared/validate.ts';

export const DEFAULT_MAX_TOKENS = 100_000;
const SYSTEM_OVERHEAD_TOKENS = 1_500;
const OUTPUT_RESERVATION_TOKENS = 2_048;
const RESERVED_TOKENS = SYSTEM_OVERHEAD_TOKENS + OUTPUT_RESERVATION_TOKENS;

export interface TrimOptions {
  reportText: string;
  history: ChatMessage[];
  maxTokens?: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function trimHistory(opts: TrimOptions): ChatMessage[] {
  const max = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  const available = max - estimateTokens(opts.reportText) - RESERVED_TOKENS;
  if (available <= 0) return [];

  // Defensive: if history has odd length, drop the oldest single message
  const normalised = opts.history.length % 2 === 0
    ? opts.history.slice()
    : opts.history.slice(1);

  if (normalised.length === 0) return [];

  // Walk newest pair to oldest, accumulating tokens, keeping while under budget
  const kept: ChatMessage[] = [];
  let used = 0;
  for (let i = normalised.length; i >= 2; i -= 2) {
    const pairMessages = normalised.slice(i - 2, i);
    const pairTokens = pairMessages.reduce(
      (sum, m) => sum + estimateTokens(m.content),
      0,
    );
    if (used + pairTokens > available) break;
    kept.unshift(...pairMessages);
    used += pairTokens;
  }
  return kept;
}
