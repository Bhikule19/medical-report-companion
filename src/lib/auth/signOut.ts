import { getBrowserSupabase } from '@/lib/supabase/browserClient';

export async function signOut(): Promise<void> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
