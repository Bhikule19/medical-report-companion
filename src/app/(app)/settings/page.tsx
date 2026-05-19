'use client';

import { useCallback, useEffect, useState } from 'react';
import { Topbar } from '@/components/shell/Topbar';
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

export default function SettingsPage() {
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
    <>
      <Topbar title="Settings" crumb="Account" />

      <div className="flex-1 overflow-y-auto px-8 py-7 max-sm:px-4 max-sm:py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-[16px] font-semibold tracking-[-0.005em]">Privacy</h2>
            <p className="mt-1.5 text-[13px] text-muted">
              Choose what gets saved to your account. Changes apply immediately.
            </p>

            {loadError && (
              <div
                role="alert"
                className="mt-4 rounded-md bg-red-soft p-3 text-[13px] text-red"
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

            <div className="mt-5">
              <ConsentToggles
                values={loading ? DEFAULT_CONSENTS : consents}
                disabled={loading || !!loadError}
                onChange={handleChange}
              />
            </div>

            {toast && (
              <div
                role="status"
                className="mt-4 rounded-md border border-amber-soft bg-amber-soft/40 p-3 text-[13px] text-amber"
              >
                {toast}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-[16px] font-semibold tracking-[-0.005em]">Display</h2>
            <p className="mt-1.5 text-[13px] text-muted">
              Make text bigger if it is hard to read. The change applies right away
              and is remembered on this device.
            </p>
            <div className="mt-5">
              <TextScalePicker value={textScale} onChange={handleScaleChange} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
