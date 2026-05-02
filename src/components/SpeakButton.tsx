'use client';

import { useEffect, useRef, useState } from 'react';

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
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
    >
      {state === 'playing' ? <StopIcon /> : state === 'loading' ? <Spinner /> : <SpeakerIcon />}
    </button>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-5 w-5" fill="currentColor">
      <path d="M9.383 3.076A1 1 0 0 1 10 4v12a1 1 0 0 1-1.707.707L4.586 13H2a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2.586l3.707-3.707a1 1 0 0 1 1.09-.217ZM13.121 6.464a1 1 0 0 1 1.414 0 5 5 0 0 1 0 7.072 1 1 0 0 1-1.414-1.414 3 3 0 0 0 0-4.244 1 1 0 0 1 0-1.414Zm2.829-2.828a1 1 0 0 1 1.414 0 9 9 0 0 1 0 12.728 1 1 0 0 1-1.414-1.414 7 7 0 0 0 0-9.9 1 1 0 0 1 0-1.414Z" />
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
