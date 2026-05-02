'use client';

import { useState } from 'react';
import { signInWithGoogle } from '@/lib/auth/signIn';

export function SignInButton() {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await signInWithGoogle(window.location.origin);
    } catch (e) {
      setBusy(false);
      console.error('signin_failed', (e as Error).message);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="rounded-md bg-slate-800 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-slate-700 disabled:bg-slate-400"
    >
      Continue with Google
    </button>
  );
}
