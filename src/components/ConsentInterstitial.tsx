'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface ConsentInterstitialProps {
  onAccept: () => void;
}

export function ConsentInterstitial({ onAccept }: ConsentInterstitialProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-xl rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Before you continue</h1>
        <p className="mt-3 text-sm text-slate-700">
          Medical Report Companion explains medical reports in plain language. The
          summaries and chat are educational and are not a substitute for a doctor.
          Please read how we handle your data and what this service does and does not
          do.
        </p>
        <ul className="mt-4 list-disc pl-5 text-sm text-slate-700">
          <li>
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-900 underline"
            >
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-900 underline"
            >
              Terms of Service
            </Link>
          </li>
        </ul>

        <label className="mt-6 flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300"
          />
          <span className="text-sm text-slate-800">
            I have read and agree to the Privacy Policy and Terms of Service.
          </span>
        </label>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onAccept}
            disabled={!agreed}
            className="rounded-md bg-slate-800 px-5 py-2 text-base font-medium text-white disabled:bg-slate-400"
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}
