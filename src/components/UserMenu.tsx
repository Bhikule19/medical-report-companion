'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/signOut';

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace('/sign-in');
  }

  return (
    <div className="flex items-center gap-3 text-body-md text-on-surface-variant">
      <span className="hidden sm:inline">{email}</span>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-md border border-outline-variant px-3 py-1.5 text-body-md text-on-surface transition-colors hover:bg-surface-container"
      >
        Sign out
      </button>
    </div>
  );
}
