'use client';

import { useRef, useState } from 'react';
import { Camera, FileUp, Upload } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (!ACCEPTED.includes(file.type)) return 'Please upload a PDF or image (JPEG/PNG).';
    if (file.size > MAX_BYTES) return 'File is too large. Maximum size is 10 MB.';
    return null;
  }

  function consume(file: File | undefined) {
    if (!file) return;
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    consume(e.target.files?.[0]);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    consume(e.dataTransfer.files?.[0]);
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
        'relative overflow-hidden rounded-xl border-[1.5px] border-dashed bg-surface px-6 pb-7 pt-9 text-center transition-all duration-200',
        dragOver ? 'border-teal bg-teal-soft' : 'border-line-2 hover:border-muted-2',
      )}
    >
      <div
        className={cn(
          'mx-auto mb-3.5 grid h-16 w-16 place-items-center rounded-lg bg-teal-soft text-teal transition-transform duration-200',
          dragOver && '-translate-y-1 scale-105 bg-white',
        )}
      >
        <Upload className="h-7 w-7" strokeWidth={1.8} aria-hidden />
      </div>

      <h2 className="mb-1.5 text-[18px] font-semibold tracking-[-0.005em]">
        Drop your report here
      </h2>
      <p className="mb-4.5 text-[13px] text-muted">
        Or pick a file from your device. We&apos;ll explain what it says in your language.
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-teal px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-teal-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileUp className="h-3.5 w-3.5" aria-hidden />
          Choose a file
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-line-2 bg-surface px-4 py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera className="h-3.5 w-3.5" aria-hidden />
          Take a photo
        </button>
      </div>

      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-2">
        PDF · JPG · PNG · up to 10 MB
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png"
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
        aria-label="Upload report"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
        aria-label="Capture report photo"
      />

      {error && (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-sm rounded-md bg-red-soft px-3.5 py-2 text-[13px] text-red"
        >
          {error}
        </p>
      )}
    </div>
  );
}
