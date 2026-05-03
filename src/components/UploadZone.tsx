'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png'];

export interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled: boolean;
}

export function UploadZone({ onFile, disabled }: UploadZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (!ACCEPTED.includes(file.type)) return 'Please upload a PDF or image (JPEG/PNG).';
    if (file.size > MAX_BYTES) return 'File is too large. Maximum size is 10 MB.';
    return null;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validate(file);
    if (err) {
      setError(err);
      e.target.value = '';
      return;
    }
    onFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    setError(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    onFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'relative flex min-h-[20rem] flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-surface-container-lowest p-10 text-center transition-all',
        dragOver
          ? 'border-secondary bg-secondary-container/30 shadow-card-hover'
          : 'border-outline-variant hover:border-secondary/50 hover:shadow-card',
      )}
    >
      <DocumentIllustration className="mb-6" />
      <label
        htmlFor="upload-input"
        className={cn(
          'cursor-pointer font-display text-headline text-on-surface',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        Drop your report here
      </label>
      <p className="mt-2 max-w-sm text-body-md text-on-surface-variant">
        Or browse from your device. PDF or photo, up to 10 MB.
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary-container px-5 py-2.5 text-body-md font-medium text-on-primary transition-all hover:-translate-y-px hover:bg-primary hover:shadow-card disabled:translate-y-0 disabled:bg-on-surface-variant disabled:opacity-60 disabled:shadow-none"
      >
        <FileUp className="h-4 w-4" aria-hidden />
        Choose a file
      </button>

      <input
        id="upload-input"
        ref={inputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png"
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
        aria-label="Upload report"
      />

      {error && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="mt-5 rounded-md bg-error-container px-4 py-2 text-body-md text-on-error-container"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

function DocumentIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden
      className={cn('h-20 w-20 text-secondary', className)}
      fill="none"
    >
      <rect
        x="20"
        y="12"
        width="56"
        height="72"
        rx="6"
        className="fill-surface-container-low"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="32" y1="28" x2="58" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="38" x2="64" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="32" y1="48" x2="60" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="32" y1="58" x2="50" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <circle cx="64" cy="58" r="3" className="fill-secondary-container" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
