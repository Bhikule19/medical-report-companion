import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateMessageInput {
  reportId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
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
      voice_input: false,
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
