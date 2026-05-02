# Google OAuth + JWT Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire Google sign-in into the frontend, gate the upload page behind it, and redeploy both Edge Functions with JWT verification on.

**Architecture:** Pure client-side auth using `@supabase/supabase-js` browser client (PKCE flow, `localStorage`). No `@supabase/ssr` dependency — the OAuth callback page is a Client Component that exchanges the code in the browser. API clients receive an `accessToken` parameter and send it as `Authorization: Bearer <jwt>`. Both Edge Functions are redeployed with `verify_jwt = true` so unauthenticated requests are rejected by the Supabase Edge runtime before our handlers run.

**Tech Stack:** Next.js 15.5.15 (App Router) · React 19 · TypeScript · Tailwind v3 · Zustand 5 · `@supabase/supabase-js` 2.104+ · Vitest 4 · @testing-library/react.

**Reference:** Design doc at `docs/plans/2026-05-02-google-oauth-jwt-design.md`. Existing UI in `src/app/page.tsx` (PR #1).

---

## Task 1: Browser Supabase client (singleton)

**Files:**
- Create: `src/lib/supabase/browserClient.ts`
- Test: `src/lib/supabase/browserClient.test.ts`

**Step 1: Write failing tests**

```typescript
// src/lib/supabase/browserClient.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('getBrowserSupabase', () => {
  it('returns the same instance on repeat calls (singleton)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    const { getBrowserSupabase } = await import('./browserClient');
    const a = getBrowserSupabase();
    const b = getBrowserSupabase();
    expect(a).toBe(b);
    vi.unstubAllEnvs();
  });

  it('throws when env vars missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const { getBrowserSupabase } = await import('./browserClient');
    expect(() => getBrowserSupabase()).toThrow(/NEXT_PUBLIC_SUPABASE/);
    vi.unstubAllEnvs();
  });
});
```

**Step 2: Run tests** → FAIL (no module).

```bash
pnpm test -- src/lib/supabase/browserClient.test.ts
```

**Step 3: Implementation**

```typescript
// src/lib/supabase/browserClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/env';

let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (client) return client;
  const cfg = getSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // we handle the callback ourselves
    },
  });
  return client;
}

// Test-only: reset the singleton between tests
export function __resetBrowserSupabaseForTests(): void {
  client = null;
}
```

**Step 4: Run tests** → PASS.

**Step 5: Commit**

```bash
git add src/lib/supabase/browserClient.ts src/lib/supabase/browserClient.test.ts
git commit -m "feat(supabase): browser client singleton with PKCE flow"
```

---

## Task 2: Auth helpers — signIn, signOut, session

**Files:**
- Create: `src/lib/auth/signIn.ts`
- Create: `src/lib/auth/signOut.ts`
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/auth.test.ts`

**Step 1: Write failing tests**

```typescript
// src/lib/auth/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

const fakeClient = {
  auth: {
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
  },
} as unknown as SupabaseClient;

vi.mock('@/lib/supabase/browserClient', () => ({
  getBrowserSupabase: () => fakeClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signInWithGoogle', () => {
  it('calls supabase OAuth with provider=google and correct redirect', async () => {
    const { signInWithGoogle } = await import('./signIn');
    (fakeClient.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { provider: 'google', url: '...' },
      error: null,
    });

    await signInWithGoogle('http://localhost:3000');

    expect(fakeClient.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:3000/auth/callback' },
    });
  });

  it('throws when supabase returns an error', async () => {
    const { signInWithGoogle } = await import('./signIn');
    (fakeClient.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'provider_disabled' },
    });
    await expect(signInWithGoogle('http://localhost:3000')).rejects.toThrow(/provider_disabled/);
  });
});

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    const { signOut } = await import('./signOut');
    (fakeClient.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    await signOut();
    expect(fakeClient.auth.signOut).toHaveBeenCalled();
  });
});

describe('getSessionToken', () => {
  it('returns access_token when session exists', async () => {
    const { getSessionToken } = await import('./session');
    (fakeClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { access_token: 'jwt-token' } as Session },
      error: null,
    });
    expect(await getSessionToken()).toBe('jwt-token');
  });

  it('returns null when no session', async () => {
    const { getSessionToken } = await import('./session');
    (fakeClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    expect(await getSessionToken()).toBeNull();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```typescript
// src/lib/auth/signIn.ts
import { getBrowserSupabase } from '@/lib/supabase/browserClient';

export async function signInWithGoogle(origin: string): Promise<void> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
}
```

```typescript
// src/lib/auth/signOut.ts
import { getBrowserSupabase } from '@/lib/supabase/browserClient';

export async function signOut(): Promise<void> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
```

```typescript
// src/lib/auth/session.ts
import { getBrowserSupabase } from '@/lib/supabase/browserClient';

export async function getSessionToken(): Promise<string | null> {
  const supabase = getBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/lib/auth/ src/lib/auth/auth.test.ts
git commit -m "feat(auth): signInWithGoogle, signOut, getSessionToken helpers"
```

---

## Task 3: useSession hook

**Files:**
- Create: `src/lib/auth/useSession.ts`
- Test: `src/lib/auth/useSession.test.tsx`

**Step 1: Write failing test**

```typescript
// src/lib/auth/useSession.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Session, Subscription, SupabaseClient } from '@supabase/supabase-js';

let listener: ((event: string, session: Session | null) => void) | null = null;
const fakeClient = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn((cb: (e: string, s: Session | null) => void) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } as unknown as Subscription } };
    }),
  },
} as unknown as SupabaseClient;

vi.mock('@/lib/supabase/browserClient', () => ({
  getBrowserSupabase: () => fakeClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
  listener = null;
});

describe('useSession', () => {
  it('starts with loading=true and resolves to a session', async () => {
    const session = { access_token: 't', user: { email: 'a@b.co' } } as unknown as Session;
    (fakeClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session },
      error: null,
    });

    const { useSession } = await import('./useSession');
    const { result } = renderHook(() => useSession());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session?.access_token).toBe('t');
  });

  it('updates when onAuthStateChange fires', async () => {
    (fakeClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { useSession } = await import('./useSession');
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();

    const session = { access_token: 'new' } as unknown as Session;
    listener!('SIGNED_IN', session);
    await waitFor(() => expect(result.current.session?.access_token).toBe('new'));
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```typescript
// src/lib/auth/useSession.ts
'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase/browserClient';

export interface UseSessionResult {
  session: Session | null;
  loading: boolean;
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/lib/auth/useSession.ts src/lib/auth/useSession.test.tsx
git commit -m "feat(auth): useSession hook with onAuthStateChange subscription"
```

---

## Task 4: Update API clients to require accessToken

**Files:**
- Modify: `src/lib/api/ocrTranslate.ts`
- Modify: `src/lib/api/ocrTranslate.test.ts`
- Modify: `src/lib/api/chat.ts`
- Modify: `src/lib/api/chat.test.ts`

**Step 1: Update ocrTranslate test to assert Bearer = accessToken**

Replace the happy-path test's header assertions:

```typescript
// in src/lib/api/ocrTranslate.test.ts, replace the header assertions in the happy-path test
expect(headers.get('Authorization')).toBe('Bearer user-jwt');
expect(headers.get('apikey')).toBe('anon');
```

…and add `accessToken: 'user-jwt'` to every `ocrTranslate({...})` call in the file.

**Step 2: Run** → FAIL.

**Step 3: Update implementation**

```typescript
// src/lib/api/ocrTranslate.ts — modify OcrTranslateInput and the fetch call
export interface OcrTranslateInput {
  file: File;
  targetLang: Language;
  accessToken: string;
  config: SupabaseConfig;
  fetchImpl?: typeof fetch;
}

// in the function body, replace the headers object:
headers: {
  Authorization: `Bearer ${input.accessToken}`,
  apikey: input.config.anonKey,
},
```

**Step 4: Run** → PASS.

**Step 5: Repeat for chat.ts**

```typescript
// src/lib/api/chat.ts — add accessToken to BaseInput and use in headers
interface BaseInput {
  reportText: string;
  language: Language;
  accessToken: string;
  config: SupabaseConfig;
  fetchImpl?: typeof fetch;
}

// in fetch call:
headers: {
  Authorization: `Bearer ${input.accessToken}`,
  apikey: input.config.anonKey,
  'Content-Type': 'application/json',
},
```

Update `src/lib/api/chat.test.ts` to pass `accessToken: 'user-jwt'` and assert the Authorization header.

**Step 6: Run all API tests** → PASS.

**Step 7: Commit**

```bash
git add src/lib/api/ocrTranslate.ts src/lib/api/ocrTranslate.test.ts src/lib/api/chat.ts src/lib/api/chat.test.ts
git commit -m "feat(api): require accessToken on ocrTranslate and chat clients"
```

---

## Task 5: SignInButton component

**Files:**
- Create: `src/components/SignInButton.tsx`
- Test: `src/components/SignInButton.test.tsx`

**Step 1: Failing test**

```typescript
// src/components/SignInButton.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signInMock = vi.fn();
vi.mock('@/lib/auth/signIn', () => ({
  signInWithGoogle: signInMock,
}));

beforeEach(() => signInMock.mockReset());

describe('SignInButton', () => {
  it('calls signInWithGoogle with window.location.origin on click', async () => {
    signInMock.mockResolvedValue(undefined);
    const { SignInButton } = await import('./SignInButton');
    render(<SignInButton />);
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(signInMock).toHaveBeenCalledWith(window.location.origin);
  });

  it('disables the button while signing in', async () => {
    let resolve!: () => void;
    signInMock.mockImplementation(() => new Promise<void>((r) => (resolve = r)));
    const { SignInButton } = await import('./SignInButton');
    render(<SignInButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    resolve();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/SignInButton.tsx
'use client';

import { useState } from 'react';
import { signInWithGoogle } from '@/lib/auth/signIn';

export function SignInButton() {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await signInWithGoogle(window.location.origin);
    } catch (e) {
      setBusy(false);
      // The redirect won't happen on error, so re-enable the button.
      console.error('signin_failed', (e as Error).message);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="rounded-md bg-slate-800 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-slate-700 disabled:bg-slate-400"
    >
      Continue with Google
    </button>
  );
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/SignInButton.tsx src/components/SignInButton.test.tsx
git commit -m "feat(ui): SignInButton triggers Google OAuth"
```

---

## Task 6: AuthGate component

**Files:**
- Create: `src/components/AuthGate.tsx`
- Test: `src/components/AuthGate.test.tsx`

**Step 1: Failing test**

```typescript
// src/components/AuthGate.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useSessionMock = vi.fn();
vi.mock('@/lib/auth/useSession', () => ({
  useSession: () => useSessionMock(),
}));

beforeEach(() => {
  replaceMock.mockReset();
  useSessionMock.mockReset();
});

describe('AuthGate', () => {
  it('renders children when a session exists', async () => {
    useSessionMock.mockReturnValue({ session: { access_token: 't' } as Session, loading: false });
    const { AuthGate } = await import('./AuthGate');
    render(
      <AuthGate>
        <p>protected</p>
      </AuthGate>,
    );
    expect(screen.getByText('protected')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects to /sign-in when no session and not loading', async () => {
    useSessionMock.mockReturnValue({ session: null, loading: false });
    const { AuthGate } = await import('./AuthGate');
    render(
      <AuthGate>
        <p>protected</p>
      </AuthGate>,
    );
    expect(replaceMock).toHaveBeenCalledWith('/sign-in');
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });

  it('renders nothing while loading', async () => {
    useSessionMock.mockReturnValue({ session: null, loading: true });
    const { AuthGate } = await import('./AuthGate');
    render(
      <AuthGate>
        <p>protected</p>
      </AuthGate>,
    );
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/AuthGate.tsx
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/useSession';

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace('/sign-in');
  }, [loading, session, router]);

  if (loading || !session) return null;
  return <>{children}</>;
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/AuthGate.tsx src/components/AuthGate.test.tsx
git commit -m "feat(ui): AuthGate redirects unauthenticated users to /sign-in"
```

---

## Task 7: UserMenu component

**Files:**
- Create: `src/components/UserMenu.tsx`
- Test: `src/components/UserMenu.test.tsx`

**Step 1: Failing test**

```typescript
// src/components/UserMenu.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signOutMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('@/lib/auth/signOut', () => ({ signOut: signOutMock }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

beforeEach(() => {
  signOutMock.mockReset();
  replaceMock.mockReset();
});

describe('UserMenu', () => {
  it('renders the email and a sign-out button', async () => {
    const { UserMenu } = await import('./UserMenu');
    render(<UserMenu email="user@example.com" />);
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('signs out and redirects to /sign-in on click', async () => {
    signOutMock.mockResolvedValue(undefined);
    const { UserMenu } = await import('./UserMenu');
    render(<UserMenu email="user@example.com" />);
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(signOutMock).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/sign-in');
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/UserMenu.tsx
'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/signOut';

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace('/sign-in');
  }

  return (
    <div className="flex items-center gap-3 text-sm text-slate-700">
      <span className="hidden sm:inline">{email}</span>
      <span className="sm:hidden">{email}</span>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
      >
        Sign out
      </button>
    </div>
  );
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/UserMenu.tsx src/components/UserMenu.test.tsx
git commit -m "feat(ui): UserMenu with sign-out and redirect"
```

---

## Task 8: Sign-in page

**Files:**
- Create: `src/app/sign-in/page.tsx`

**Step 1: Implementation (no separate test — it's a thin composition)**

```tsx
// src/app/sign-in/page.tsx
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Medical Report Companion</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to upload a report and chat about it.
        </p>
        {errorMessage && (
          <div role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
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
```

**Step 2: Verify build**

```bash
pnpm build
```

Expected: builds without error. The Suspense boundary is required because `useSearchParams` opts the page out of full static generation.

**Step 3: Commit**

```bash
git add src/app/sign-in/page.tsx
git commit -m "feat(ui): /sign-in page with error banner"
```

---

## Task 9: OAuth callback page

**Files:**
- Create: `src/app/auth/callback/page.tsx`

**Step 1: Implementation**

```tsx
// src/app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/browserClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');

    if (!code) {
      router.replace('/sign-in?error=oauth_failed');
      return;
    }

    const supabase = getBrowserSupabase();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace('/sign-in?error=oauth_failed');
      } else {
        router.replace('/');
      }
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-slate-600">
      <p>Signing you in…</p>
    </main>
  );
}
```

No unit test for this — it's a glue page with timing-sensitive useEffect that's better verified by manual smoke test.

**Step 2: Verify build**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/app/auth/callback/page.tsx
git commit -m "feat(ui): /auth/callback page exchanges code for session"
```

---

## Task 10: Wire AuthGate, UserMenu, and accessToken into the home page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace the page**

```tsx
// src/app/page.tsx
'use client';

import { useState } from 'react';
import { LanguagePicker } from '@/components/LanguagePicker';
import { UploadZone } from '@/components/UploadZone';
import { ReportSummary } from '@/components/ReportSummary';
import { ChatPanel } from '@/components/ChatPanel';
import { AuthGate } from '@/components/AuthGate';
import { UserMenu } from '@/components/UserMenu';
import { useReportStore } from '@/store/useReportStore';
import { ocrTranslate, OcrError } from '@/lib/api/ocrTranslate';
import { chat } from '@/lib/api/chat';
import { getSupabaseConfig } from '@/lib/env';
import { useSession } from '@/lib/auth/useSession';
import { useRouter } from 'next/navigation';
import type { Language } from '@/lib/types';

const config = getSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

function HomeContent() {
  const router = useRouter();
  const { session } = useSession();

  const language = useReportStore((s) => s.language);
  const report = useReportStore((s) => s.report);
  const summary = useReportStore((s) => s.summary);
  const summaryStreaming = useReportStore((s) => s.summaryStreaming);
  const messages = useReportStore((s) => s.messages);
  const chatStreaming = useReportStore((s) => s.chatStreaming);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleAuthFailure() {
    router.replace('/sign-in?error=session_expired');
  }

  async function handleFile(file: File) {
    if (!session) return handleAuthFailure();
    setUploadError(null);
    setUploading(true);
    try {
      const result = await ocrTranslate({
        file,
        targetLang: language,
        accessToken: session.access_token,
        config,
      });
      useReportStore.getState().setReport({
        originalText: result.original_text,
        pageCount: result.page_count,
        sourceLang: result.source_language as Language,
      });
      await streamSummary(result.original_text, language, session.access_token);
    } catch (e) {
      if (e instanceof OcrError && e.status === 401) return handleAuthFailure();
      if (e instanceof OcrError && e.status === 429 && e.retryAfterSeconds) {
        setUploadError(`Too many requests. Try again in ${e.retryAfterSeconds}s.`);
      } else {
        setUploadError(e instanceof Error ? e.message : 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  }

  async function streamSummary(reportText: string, lang: Language, accessToken: string) {
    const store = useReportStore.getState();
    store.setSummaryStreaming(true);
    try {
      for await (const ev of chat({
        mode: 'summary',
        reportText,
        language: lang,
        accessToken,
        config,
      })) {
        if (ev.kind === 'chunk') store.appendSummary(ev.text);
        else if (ev.kind === 'footer') store.appendSummary(`\n\n${ev.text}`);
        else if (ev.kind === 'error') store.appendSummary(`\n\n(error: ${ev.message})`);
      }
    } finally {
      useReportStore.getState().setSummaryStreaming(false);
    }
  }

  async function handleSendChat(question: string) {
    if (!report || !session) return;
    const store = useReportStore.getState();
    const history = store.messages;
    store.appendUserMessage(question);
    store.setChatStreaming(true);
    try {
      for await (const ev of chat({
        mode: 'chat',
        reportText: report.originalText,
        language,
        accessToken: session.access_token,
        history,
        question,
        config,
      })) {
        if (ev.kind === 'chunk') store.appendAssistantChunk(ev.text);
        else if (ev.kind === 'footer') store.appendAssistantChunk(`\n\n${ev.text}`);
        else if (ev.kind === 'error') store.appendAssistantChunk(`\n\n(error: ${ev.message})`);
      }
    } finally {
      useReportStore.getState().setChatStreaming(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Medical Report Companion</h1>
        <div className="flex items-center gap-4">
          <LanguagePicker />
          {session?.user?.email && <UserMenu email={session.user.email} />}
        </div>
      </header>

      {!report && <UploadZone onFile={handleFile} disabled={uploading} />}

      {uploading && <p className="text-sm text-slate-600">Reading your report…</p>}
      {uploadError && (
        <div role="alert" className="rounded-md bg-red-50 p-4 text-red-800">
          {uploadError}
        </div>
      )}

      {report && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ReportSummary
            summary={summary}
            pageCount={report.pageCount}
            sourceLang={report.sourceLang}
            streaming={summaryStreaming}
          />
          <ChatPanel
            messages={messages}
            onSend={handleSendChat}
            streaming={chatStreaming || summaryStreaming}
          />
        </div>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <HomeContent />
    </AuthGate>
  );
}
```

**Step 2: Run full test suite + build**

```bash
pnpm test
pnpm build
```

Expected: tests green, build succeeds.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(ui): gate home page behind AuthGate, send session JWT to APIs"
```

---

## Task 11: Enable JWT verification on Edge Functions

**Files:**
- Modify: `supabase/config.toml` — add `[functions.*]` blocks.

**Step 1: Append to `supabase/config.toml`**

```toml
[functions.ocr-translate]
verify_jwt = true

[functions.chat]
verify_jwt = true
```

**Step 2: Redeploy both functions** (parent agent runs these — subagent permissions are inconsistent for supabase CLI).

```bash
supabase functions deploy ocr-translate --project-ref rrrtsssvoxgbwnyxewqc
supabase functions deploy chat --project-ref rrrtsssvoxgbwnyxewqc
```

Expected: both report `Deployed Function ... successfully`.

**Step 3: Smoke-test the gate**

```bash
# No auth → expect 401
curl -i -X POST \
  -H "apikey: $(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{"mode":"summary","report_text":"x","target_language":"hi"}' \
  https://rrrtsssvoxgbwnyxewqc.supabase.co/functions/v1/chat
# Expected: HTTP/2 401
```

**Step 4: Commit**

```bash
git add supabase/config.toml
git commit -m "feat(edge): enable JWT verification on ocr-translate and chat"
```

---

## Task 12: Final verification

**Step 1: Full test suite**

```bash
pnpm test
```

Expected: all tests pass.

**Step 2: Lint**

```bash
pnpm lint
```

**Step 3: Build**

```bash
pnpm build
```

**Step 4: Manual smoke test**

```bash
pnpm dev
```

In a private browser window:

1. Visit `http://localhost:3000` → redirected to `/sign-in`.
2. Click "Continue with Google" → Google consent → land back on `/`.
3. Upload `tests/fixtures/digital-en.pdf` with language=Hindi → summary streams.
4. Ask a chat question → reply streams.
5. Click "Sign out" → redirected to `/sign-in`.
6. In DevTools, edit the value at `localStorage['sb-rrrtsssvoxgbwnyxewqc-auth-token']` to garbage, refresh `/`, try to upload → 401 → redirected to `/sign-in?error=session_expired`.

**Step 5: Push branch + open PR**

```bash
git push -u origin feat/google-oauth
gh pr create --base master \
  --title "feat(auth): Google OAuth + JWT verification on Edge Functions (Phase 3.4)" \
  --body "$(cat <<'EOF'
## Summary
- Adds Google OAuth sign-in via Supabase Auth (PKCE flow, localStorage session).
- Gates the home page behind `<AuthGate>`. Unauthenticated users land on `/sign-in`.
- Both Edge Functions (`/ocr-translate`, `/chat`) redeployed with JWT verification on. Anon-key-only requests now return 401.
- API clients now require an `accessToken` parameter and send `Authorization: Bearer <jwt>`.
- No persistence yet — that's PR #3 (Phase 4).

## Design doc
`docs/plans/2026-05-02-google-oauth-jwt-design.md`. Executable plan: `docs/plans/2026-05-02-google-oauth-jwt.md`.

## Required Supabase Dashboard configuration (please verify before testing)
- Authentication → Providers → Google: enabled with your Client ID + Secret.
- Authentication → URL Configuration → Site URL: `http://localhost:3000`.
- Authentication → URL Configuration → Redirect URLs: includes `http://localhost:3000/auth/callback`.

## Test plan
- [ ] `pnpm install` → `pnpm test` (all unit + component tests pass)
- [ ] `pnpm build` succeeds
- [ ] `pnpm dev`, visit `localhost:3000` → redirected to `/sign-in`
- [ ] Sign in with Google → redirected to `/`
- [ ] Upload `tests/fixtures/digital-en.pdf` (Hindi) → summary streams
- [ ] Chat → response streams; safety footer appears on jailbreak prompts
- [ ] Sign out → redirected to `/sign-in`
- [ ] Tamper localStorage JWT → upload returns 401, redirected with banner
- [ ] `curl` to `/chat` with anon key only → 401 (no JWT verification bypass)

## Out of scope
- Phase 4 — persist reports + messages with RLS-scoped writes.
- Phases 5–9 — Maps, voice, settings, consent, large-text toggle.
EOF
)"
```

---

## Done definition

- All 12 tasks committed.
- `pnpm test` passes.
- `pnpm build` succeeds.
- Both Edge Functions redeployed with `verify_jwt = true`.
- PR open against `master`.
- Manual smoke test confirms OAuth round-trip + 401 on tampered JWT.
