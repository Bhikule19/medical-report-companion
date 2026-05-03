'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignInButton } from '@/components/SignInButton';

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: 'Sign-in failed. Please try again.',
  session_expired: 'Your session expired. Please sign in again.',
};

function SignInContent() {
  const params = useSearchParams();
  const errorKey = params.get('error');
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md rounded-lg border border-outline-variant bg-surface-container-lowest p-8 shadow-card">
        <h1 className="font-display text-headline text-on-surface">
          Medical Report Companion
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Sign in to upload a report and chat about it.
        </p>
        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-md bg-error-container p-3 text-body-md text-on-error-container"
          >
            {errorMessage}
          </div>
        )}
        <div className="mt-6">
          <SignInButton />
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
