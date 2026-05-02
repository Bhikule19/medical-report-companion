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
    <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <label
        htmlFor="upload-input"
        className="block cursor-pointer text-lg font-medium text-slate-700"
      >
        Upload report
      </label>
      <p className="mt-2 text-sm text-slate-500">PDF or image, up to 10 MB</p>
      <input
        id="upload-input"
        type="file"
        accept=".pdf,image/jpeg,image/png"
        className="mt-4"
        onChange={handleChange}
        disabled={disabled}
        aria-label="Upload report"
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
