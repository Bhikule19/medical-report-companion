'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/browserClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');

    if (!code) {
      router.replace('/sign-in?error=oauth_failed');
      return;
    }

    const supabase = getBrowserSupabase();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace('/sign-in?error=oauth_failed');
      } else {
        router.replace('/');
      }
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-slate-600">
      <p>Signing you in…</p>
    </main>
  );
}
