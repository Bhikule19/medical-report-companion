import type { SupabaseClient } from '@supabase/supabase-js';

export interface ConsentValues {
  store_reports: boolean;
  store_chat: boolean;
  store_voice_transcripts: boolean;
}

export const DEFAULT_CONSENTS: ConsentValues = {
  store_reports: true,
  store_chat: true,
  store_voice_transcripts: true,
};

export async function getConsents(
  client: SupabaseClient,
  userId: string,
): Promise<ConsentValues> {
  const { data, error } = await client
    .from('consents')
    .select('store_reports, store_chat, store_voice_transcripts')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_CONSENTS;
  return data as ConsentValues;
}

export async function updateConsents(
  client: SupabaseClient,
  userId: string,
  partial: Partial<ConsentValues>,
): Promise<void> {
  const { error } = await client
    .from('consents')
    .upsert({ user_id: userId, ...partial }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}
