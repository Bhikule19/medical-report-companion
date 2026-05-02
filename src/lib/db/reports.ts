import type { SupabaseClient } from '@supabase/supabase-js';
import type { Language } from '@/lib/types';

export interface CreateReportInput {
  userId: string;
  title: string;
  extractedText: string;
  translatedText: string | null;
  sourceLang: Language | null;
  targetLang: Language;
  pageCount: number | null;
}

export interface ReportRow {
  id: string;
  user_id: string;
  title: string | null;
  extracted_text: string;
  translated_text: string | null;
  source_lang: Language | null;
  target_lang: Language;
  page_count: number | null;
  created_at: string;
}

export interface ReportSummaryRow {
  id: string;
  title: string | null;
  created_at: string;
  target_lang: Language;
}

export async function createReport(
  client: SupabaseClient,
  input: CreateReportInput,
): Promise<{ id: string; created_at: string }> {
  const { data, error } = await client
    .from('reports')
    .insert({
      user_id: input.userId,
      title: input.title,
      extracted_text: input.extractedText,
      translated_text: input.translatedText,
      source_lang: input.sourceLang,
      target_lang: input.targetLang,
      page_count: input.pageCount,
    })
    .select('id, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data as { id: string; created_at: string };
}

export async function listReports(
  client: SupabaseClient,
  userId: string,
): Promise<ReportSummaryRow[]> {
  const { data, error } = await client
    .from('reports')
    .select('id, title, created_at, target_lang')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ReportSummaryRow[];
}

export async function getReport(
  client: SupabaseClient,
  reportId: string,
): Promise<ReportRow> {
  const { data, error } = await client
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) throw new Error(error.message);
  return data as ReportRow;
}
