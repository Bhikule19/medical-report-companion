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
    <div className="flex items-center gap-3 text-sm text-slate-700">
      <span>{email}</span>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
      >
        Sign out
      </button>
    </div>
  );
}
