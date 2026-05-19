'use client';

import { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { isRecordingSupported } from '@/lib/audio/recorder';
import { VoiceOverlay } from './VoiceOverlay';

export interface VoiceInputButtonProps {
  disabled: boolean;
  onTranscribe: (blob: Blob) => Promise<void>;
}

/**
 * Trigger for voice mode. Opens the full-screen orb overlay which records,
 * transcribes, and hands the transcript back via `onTranscribe`.
 */
export function VoiceInputButton({ disabled, onTranscribe }: VoiceInputButtonProps) {
  const [supported, setSupported] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSupported(isRecordingSupported());
  }, []);

  if (!supported) return null;

  // The overlay collects audio and returns the transcript synchronously through
  // `onTranscript`. ChatPanel expects an `onTranscribe(blob) => Promise<void>`
  // so we adapt: run the blob through the caller, swallow the resolved value,
  // and surface the transcript via the overlay's `onTranscript` hook.
  async function transcribeBlob(blob: Blob): Promise<string> {
    // ChatPanel's onTranscribe sets the input state via a side-effect; we
    // intercept the blob, let ChatPanel transcribe it, and rely on its handler
    // to set the draft. Here we return an empty string because the overlay's
    // onTranscript path isn't used in this flow.
    await onTranscribe(blob);
    return '';
  }

  return (
    <>
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        aria-label="Start voice mode"
        title="Start voice mode"
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-muted transition-colors hover:bg-teal-soft hover:text-teal disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Mic className="h-4 w-4" aria-hidden />
      </button>
      <VoiceOverlay
        open={open}
        onClose={() => setOpen(false)}
        onTranscribe={transcribeBlob}
        onTranscript={() => {
          /* transcript is handled by ChatPanel through onTranscribe */
        }}
      />
    </>
  );
}
