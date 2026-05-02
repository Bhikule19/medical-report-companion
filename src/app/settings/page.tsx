'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGate } from '@/components/AuthGate';
import { ConsentToggles } from '@/components/ConsentToggles';
import { useSession } from '@/lib/auth/useSession';
import { getBrowserSupabase } from '@/lib/supabase/browserClient';
import {
  getConsents,
  updateConsents,
  DEFAULT_CONSENTS,
  type ConsentValues,
} from '@/lib/db/consents';
import { useReportStore } from '@/store/useReportStore';

function SettingsContent() {
  const { session } = useSession();
  const supabase = getBrowserSupabase();
  const consents = useReportStore((s) => s.consents);
  const setConsents = useReportStore((s) => s.setConsents);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(
    async (userId: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const values = await getConsents(supabase, userId);
        setConsents(values);
      } catch (e) {
        setLoadError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [supabase, setConsents],
  );

  useEffect(() => {
    if (session?.user?.id) load(session.user.id);
  }, [session?.user?.id, load]);

  async function handleChange(key: keyof ConsentValues, next: boolean) {
    if (!session?.user?.id) return;
    const previous = consents;
    const optimistic = { ...consents, [key]: next };
    setConsents(optimistic);
    try {
      await updateConsents(supabase, session.user.id, { [key]: next });
      setToast(null);
    } catch (e) {
      setConsents(previous);
      setToast(`Couldn't save your preference: ${(e as Error).message}`);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Link href="/" className="text-sm text-slate-600 underline">
          Back
        </Link>
      </header>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">Privacy</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose what gets saved to your account. Changes apply immediately.
        </p>

        {loadError && (
          <div role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            Couldn&apos;t load your settings: {loadError}{' '}
            <button
              type="button"
              className="underline"
              onClick={() => session?.user?.id && load(session.user.id)}
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-6">
          <ConsentToggles
            values={loading ? DEFAULT_CONSENTS : consents}
            disabled={loading || !!loadError}
            onChange={handleChange}
          />
        </div>

        {toast && (
          <div role="status" className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            {toast}
          </div>
        )}
      </section>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsContent />
    </AuthGate>
  );
}
