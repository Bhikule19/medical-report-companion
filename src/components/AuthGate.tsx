'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/useSession';

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace('/sign-in');
  }, [loading, session, router]);

  if (loading || !session) return null;
  return <>{children}</>;
}
