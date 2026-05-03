'use client';

import { useState } from 'react';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png'];

export interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled: boolean;
}

export function UploadZone({ onFile, disabled }: UploadZoneProps) {
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError('Please upload a PDF or image (JPEG/PNG).');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File is too large. Maximum size is 10 MB.');
      e.target.value = '';
      return;
    }
    onFile(file);
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center transition-colors hover:border-accent">
      <label
        htmlFor="upload-input"
        className="block cursor-pointer font-display text-headline text-on-surface"
      >
        Upload report
      </label>
      <p className="mt-2 text-body-md text-on-surface-variant">
        PDF or image, up to 10 MB
      </p>
      <input
        id="upload-input"
        type="file"
        accept=".pdf,image/jpeg,image/png"
        className="mt-6 block w-full max-w-xs cursor-pointer mx-auto rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md text-on-surface file:mr-4 file:rounded-md file:border-0 file:bg-primary-container file:px-4 file:py-2 file:text-body-md file:font-medium file:text-on-primary hover:file:bg-primary disabled:opacity-60"
        onChange={handleChange}
        disabled={disabled}
        aria-label="Upload report"
      />
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-error-container p-3 text-body-md text-on-error-container"
        >
          {error}
        </p>
      )}
    </div>
  );
}
