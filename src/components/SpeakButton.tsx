'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Square, Volume2 } from 'lucide-react';

export interface SpeakButtonProps {
  text: string;
  onPlay: (text: string) => Promise<Blob>;
}

export function SpeakButton({ text, onPlay }: SpeakButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  function cleanupAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }

  async function handleClick() {
    if (state === 'playing') {
      cleanupAudio();
      setState('idle');
      return;
    }
    if (state === 'loading') return;

    setState('loading');
    try {
      const blob = await onPlay(text);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audio.onended = () => {
        cleanupAudio();
        setState('idle');
      };
      audio.onerror = () => {
        cleanupAudio();
        setState('idle');
      };
      audioRef.current = audio;
      await audio.play();
      setState('playing');
    } catch (e) {
      cleanupAudio();
      setState('idle');
      console.error('tts_failed', (e as Error).message);
    }
  }

  const label =
    state === 'playing' ? 'Stop audio' : state === 'loading' ? 'Loading audio' : 'Read aloud';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
    >
      {state === 'playing' ? (
        <Square className="h-3.5 w-3.5 fill-current" />
      ) : state === 'loading' ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </button>
  );
}
