import { getBrowserSupabase } from '@/lib/supabase/browserClient';

export async function signInWithGoogle(origin: string): Promise<void> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
}
