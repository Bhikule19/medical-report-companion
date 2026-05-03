'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { EmailAuthForm } from '@/components/EmailAuthForm';
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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface p-6">
      {/* Subtle layered radial gradients — atmosphere without distraction. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(134, 242, 228, 0.35), transparent 60%)',
            'radial-gradient(ellipse 60% 50% at 100% 50%, rgba(213, 227, 253, 0.4), transparent 60%)',
            'radial-gradient(ellipse 70% 50% at 50% 110%, rgba(252, 222, 179, 0.25), transparent 60%)',
          ].join(', '),
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-card-hover"
      >
        <h1 className="font-display text-display text-on-surface">
          Medical Report Companion
        </h1>
        <p className="mt-3 text-body-md text-on-surface-variant">
          Sign in to upload a report and chat about it.
        </p>
        {errorMessage && (
          <div
            role="alert"
            className="mt-5 rounded-md bg-error-container p-3 text-body-md text-on-error-container"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-7">
          <SignInButton />
        </div>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-outline-variant" aria-hidden />
          <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
            or
          </span>
          <span className="h-px flex-1 bg-outline-variant" aria-hidden />
        </div>

        <EmailAuthForm />
      </motion.div>
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
