'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import {
  isRecordingSupported,
  startRecording,
  type RecorderHandle,
} from '@/lib/audio/recorder';
import { cn } from '@/lib/utils';

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
      className={cn(
        'flex h-touch-target w-touch-target shrink-0 items-center justify-center rounded-md border transition-all disabled:opacity-50',
        recording
          ? 'border-error bg-error-container text-on-error-container hover:bg-error-container/80'
          : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:-translate-y-px hover:border-outline hover:bg-surface-container-low hover:shadow-card',
      )}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : recording ? (
        <Square className="h-4 w-4 fill-current" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </button>
  );
}
