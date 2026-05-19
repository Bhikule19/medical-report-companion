'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MicOff, X } from 'lucide-react';
import { startRecording, type RecorderHandle } from '@/lib/audio/recorder';
import { cn } from '@/lib/utils';

export interface VoiceOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Called with the recorded audio after the user ends the session. */
  onTranscribe: (blob: Blob) => Promise<string>;
  /** Receives the transcribed text once it lands. */
  onTranscript: (text: string) => void;
}

type Phase = 'starting' | 'listening' | 'transcribing' | 'error';

/**
 * Full-screen voice mode overlay — animated teal orb on a deep teal-to-ink
 * gradient. Starts recording immediately on open, transcribes on stop, then
 * closes and hands the transcript back to the caller.
 */
export function VoiceOverlay({ open, onClose, onTranscribe, onTranscript }: VoiceOverlayProps) {
  const [phase, setPhase] = useState<Phase>('starting');
  const [muted, setMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const handleRef = useRef<RecorderHandle | null>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    if (!open) {
      closingRef.current = false;
      setPhase('starting');
      setMuted(false);
      setErrorMsg(null);
      return;
    }

    let cancelled = false;
    setPhase('starting');
    setErrorMsg(null);

    (async () => {
      try {
        const h = await startRecording();
        if (cancelled) {
          await h.stop().catch(() => undefined);
          return;
        }
        handleRef.current = h;
        setPhase('listening');
      } catch (e) {
        if (!cancelled) {
          setErrorMsg((e as Error).message || 'Microphone access denied.');
          setPhase('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      const h = handleRef.current;
      handleRef.current = null;
      h?.stop().catch(() => undefined);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function handleEnd() {
    if (closingRef.current) return;
    closingRef.current = true;
    const h = handleRef.current;
    handleRef.current = null;
    if (!h) {
      onClose();
      return;
    }
    setPhase('transcribing');
    try {
      const { blob } = await h.stop();
      const transcript = await onTranscribe(blob);
      onTranscript(transcript);
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      onClose();
    }
  }

  function handleClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    const h = handleRef.current;
    handleRef.current = null;
    h?.stop().catch(() => undefined);
    onClose();
  }

  const statusLabel =
    phase === 'starting'
      ? 'Connecting…'
      : phase === 'transcribing'
        ? 'Transcribing…'
        : phase === 'error'
          ? 'Couldn’t open the microphone'
          : 'Listening…';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice mode"
      className="fixed inset-0 z-[100] grid animate-fade-in place-items-center text-white"
      style={{ background: 'linear-gradient(180deg, #0B1F2A 0%, #042329 100%)' }}
    >
      <div className="flex flex-col items-center gap-7 px-6 text-center">
        <div className="relative grid h-[220px] w-[220px] place-items-center">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border-[1.5px] border-[rgba(92,227,223,0.5)]"
            style={{ animation: 'orb-ring 2.6s ease-out infinite' }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border-[1.5px] border-[rgba(92,227,223,0.5)]"
            style={{ animation: 'orb-ring 2.6s ease-out infinite', animationDelay: '1.3s' }}
          />
          <div
            aria-hidden
            className={cn(
              'voice-orb h-full w-full rounded-full',
              phase === 'listening' && 'animate-orb-pulse',
            )}
          />
        </div>

        <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-white/60">
          {statusLabel}
        </p>

        <p
          className={cn(
            'min-h-[60px] max-w-[580px] text-[22px] font-medium leading-snug tracking-[-0.01em]',
            phase === 'listening' && 'text-white/45',
            phase === 'error' && 'text-red-soft',
          )}
        >
          {phase === 'error'
            ? errorMsg ?? 'Try allowing microphone access in your browser settings.'
            : phase === 'transcribing'
              ? 'Almost done…'
              : 'Tap to start talking when you’re ready.'}
        </p>

        <div className="mt-1 flex gap-4">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            disabled={phase !== 'listening'}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className={cn(
              'grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50',
              muted && 'bg-white/15',
            )}
          >
            <MicOff className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={phase === 'transcribing' ? undefined : handleEnd}
            disabled={phase === 'transcribing'}
            aria-label="End voice mode"
            className="grid h-14 w-14 place-items-center rounded-full border border-red bg-red text-white transition-colors hover:bg-[#911B12] disabled:cursor-wait"
          >
            {phase === 'transcribing' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <X className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
