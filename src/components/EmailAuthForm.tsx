'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signUpWithEmail } from '@/lib/auth/signIn';
import { cn } from '@/lib/utils';

type Mode = 'sign-in' | 'sign-up';

const PASSWORD_MIN = 8;

export function EmailAuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  function clearForm() {
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (mode === 'sign-up') {
      if (name.trim().length === 0) {
        setError('Please enter your name.');
        return;
      }
      if (password.length < PASSWORD_MIN) {
        setError(`Use at least ${PASSWORD_MIN} characters for your password.`);
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'sign-in') {
        await signInWithEmail({ email: email.trim(), password });
        // Successful sign-in fires a session change; the AuthGate on / will
        // pick it up. Push the user there explicitly for snappier UX.
        router.replace('/');
      } else {
        const result = await signUpWithEmail({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        if (result.needsEmailConfirmation) {
          setConfirmationEmail(email.trim());
          clearForm();
        } else {
          router.replace('/');
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (confirmationEmail) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        role="status"
        className="rounded-md border border-secondary/40 bg-secondary-container/40 p-5"
      >
        <p className="font-display text-body-lg font-semibold text-on-surface">
          Check your email
        </p>
        <p className="mt-2 text-body-md text-on-surface-variant">
          We sent a verification link to{' '}
          <span className="font-medium text-on-surface">{confirmationEmail}</span>. Click
          the link to activate your account, then come back here to sign in.
        </p>
        <button
          type="button"
          onClick={() => {
            setConfirmationEmail(null);
            setMode('sign-in');
          }}
          className="mt-4 text-body-md font-medium text-secondary underline"
        >
          Back to sign in
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {mode === 'sign-up' && (
        <Field label="Name">
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            className={inputClass}
            placeholder="Your name"
            required
          />
        </Field>
      )}

      <Field label="Email">
        <input
          type="email"
          autoComplete={mode === 'sign-in' ? 'email' : 'email'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          className={inputClass}
          placeholder="you@example.com"
          required
        />
      </Field>

      <Field label="Password" hint={mode === 'sign-up' ? `At least ${PASSWORD_MIN} characters` : undefined}>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            className={cn(inputClass, 'pr-11')}
            placeholder={mode === 'sign-up' ? 'Create a password' : 'Your password'}
            minLength={mode === 'sign-up' ? PASSWORD_MIN : undefined}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant transition-colors hover:text-on-surface"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="rounded-md bg-error-container px-3 py-2 text-body-md text-on-error-container"
        >
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary-container px-6 py-3 text-body-md font-medium text-on-primary shadow-card transition-all hover:-translate-y-px hover:bg-primary disabled:translate-y-0 disabled:bg-on-surface-variant disabled:opacity-60 disabled:shadow-none"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === 'sign-in' ? 'Sign in' : 'Create account'}
      </button>

      <p className="text-center text-body-md text-on-surface-variant">
        {mode === 'sign-in' ? (
          <>
            New here?{' '}
            <button
              type="button"
              onClick={() => switchMode('sign-up')}
              className="font-medium text-secondary underline transition-colors hover:text-secondary/80"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('sign-in')}
              className="font-medium text-secondary underline transition-colors hover:text-secondary/80"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  );
}

const inputClass =
  'w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface placeholder:text-on-surface-variant/60 transition-colors hover:border-outline focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 disabled:bg-surface-container-low disabled:text-on-surface-variant';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      {children}
      {hint && <span className="text-label-caps normal-case tracking-normal text-on-surface-variant">{hint}</span>}
    </label>
  );
}
