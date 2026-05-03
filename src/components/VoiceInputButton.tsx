'use client';

import { useEffect, useRef, useState } from 'react';
import {
  isRecordingSupported,
  startRecording,
  type RecorderHandle,
} from '@/lib/audio/recorder';

export interface VoiceInputButtonProps {
  disabled: boolean;
  onTranscribe: (blob: Blob) => Promise<void>;
}

export function VoiceInputButton({ disabled, onTranscribe }: VoiceInputButtonProps) {
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const handleRef = useRef<RecorderHandle | null>(null);

  useEffect(() => {
    setSupported(isRecordingSupported());
  }, []);

  if (!supported) return null;

  async function handleClick() {
    if (busy) return;

    if (recording) {
      const handle = handleRef.current;
      handleRef.current = null;
      setRecording(false);
      if (!handle) return;
      setBusy(true);
      try {
        const { blob } = await handle.stop();
        await onTranscribe(blob);
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const handle = await startRecording();
      handleRef.current = handle;
      setRecording(true);
    } catch (e) {
      console.error('mic_permission_failed', (e as Error).message);
      alert('Microphone access is required for voice input. Allow it in your browser settings.');
    }
  }

  const label = recording ? 'Stop recording' : 'Start voice input';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      aria-label={label}
      title={label}
      className={`flex h-touch-target w-touch-target shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
        recording
          ? 'border-error bg-error-container text-on-error-container hover:bg-error-container/80'
          : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-outline hover:bg-surface-container-low'
      }`}
    >
      {busy ? <Spinner /> : recording ? <StopIcon /> : <MicIcon />}
    </button>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-5 w-5" fill="currentColor">
      <path d="M10 2a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M5 9a1 1 0 0 1 1 1 4 4 0 0 0 8 0 1 1 0 0 1 2 0 6 6 0 0 1-5 5.917V17h2a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h2v-1.083A6 6 0 0 1 4 10a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="currentColor">
      <rect x="4" y="4" width="12" height="12" rx="1.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-5 w-5 animate-spin" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M17 10a7 7 0 0 0-7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
