import { getBrowserSupabase } from '@/lib/supabase/browserClient';

export async function getSessionToken(): Promise<string | null> {
  const supabase = getBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
