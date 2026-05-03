'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthGate } from '@/components/AuthGate';
import { ConsentToggles } from '@/components/ConsentToggles';
import { TextScalePicker } from '@/components/TextScalePicker';
import { useSession } from '@/lib/auth/useSession';
import { getBrowserSupabase } from '@/lib/supabase/browserClient';
import {
  getConsents,
  updateConsents,
  DEFAULT_CONSENTS,
  type ConsentValues,
} from '@/lib/db/consents';
import {
  loadTextScale,
  saveTextScale,
  applyTextScale,
  type TextScale,
} from '@/lib/display/textScale';
import { useReportStore } from '@/store/useReportStore';

function SettingsContent() {
  const { session } = useSession();
  const supabase = getBrowserSupabase();
  const consents = useReportStore((s) => s.consents);
  const setConsents = useReportStore((s) => s.setConsents);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [textScale, setTextScale] = useState<TextScale>('standard');

  useEffect(() => {
    setTextScale(loadTextScale());
  }, []);

  function handleScaleChange(next: TextScale) {
    setTextScale(next);
    saveTextScale(next);
    applyTextScale(next);
  }

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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-page-margin py-page-margin">
      <header className="flex items-center justify-between border-b border-outline-variant pb-4">
        <h1 className="font-display text-display text-on-surface">Settings</h1>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </header>

      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-card-pad shadow-card">
        <h2 className="font-display text-headline text-on-surface">Privacy</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Choose what gets saved to your account. Changes apply immediately.
        </p>

        {loadError && (
          <div
            role="alert"
            className="mt-4 rounded-md bg-error-container p-3 text-body-md text-on-error-container"
          >
            Couldn&apos;t load your settings: {loadError}{' '}
            <button
              type="button"
              className="font-medium underline"
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
          <div
            role="status"
            className="mt-4 rounded-md border border-tertiary-container bg-tertiary-container/30 p-3 text-body-md text-on-tertiary-container"
          >
            {toast}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-card-pad shadow-card">
        <h2 className="font-display text-headline text-on-surface">Display</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Make text bigger if it is hard to read. The change applies right away and
          is remembered on this device.
        </p>
        <div className="mt-6">
          <TextScalePicker value={textScale} onChange={handleScaleChange} />
        </div>
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
