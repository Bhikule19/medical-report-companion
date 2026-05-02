import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateMessageInput {
  reportId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  voiceInput?: boolean;
}

export interface MessageRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export async function createMessage(
  client: SupabaseClient,
  input: CreateMessageInput,
): Promise<{ id: string }> {
  const { data, error } = await client
    .from('messages')
    .insert({
      report_id: input.reportId,
      user_id: input.userId,
      role: input.role,
      content: input.content,
      voice_input: input.voiceInput ?? false,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function listMessagesForReport(
  client: SupabaseClient,
  reportId: string,
): Promise<MessageRow[]> {
  const { data, error } = await client
    .from('messages')
    .select('id, role, content, created_at')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MessageRow[];
}

// Delete every chat message for a report except the very first one (the
// persisted summary). RLS scopes both queries to the signed-in user.
// No-op when the report has no persisted messages (consents-off path).
export async function clearChatMessagesKeepingSummary(
  client: SupabaseClient,
  reportId: string,
): Promise<void> {
  const { data: first, error: selectError } = await client
    .from('messages')
    .select('id')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);
  if (!first?.id) return;

  const { error: deleteError } = await client
    .from('messages')
    .delete()
    .eq('report_id', reportId)
    .neq('id', first.id);

  if (deleteError) throw new Error(deleteError.message);
}
