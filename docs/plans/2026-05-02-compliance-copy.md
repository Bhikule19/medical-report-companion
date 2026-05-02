# Compliance Copy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a privacy policy page, a Terms of Service page (with a prominent "not medical advice" disclaimer), a first-time consent gate after sign-in, and a footer with links to both legal pages.

**Architecture:** Two static pages rendered as plain JSX (no MDX). A versioned consent acknowledgement stored in `localStorage` gates the authenticated app surface — bumping the version forces re-acknowledgement. Public legal pages are not auth-gated so anyone can read them.

**Tech Stack:** Next.js 15.5.15 · React 19 · TypeScript · Tailwind v3 · Vitest 4 · @testing-library/react.

**Reference:** Design at `docs/plans/2026-05-02-compliance-copy-design.md`.

---

## Task 1: Policy version constant

**Files:**
- Create: `src/lib/legal/versions.ts`

**Step 1: Implementation (no test — single constant)**

```typescript
// src/lib/legal/versions.ts
export const POLICY_VERSION = '2026-05-02';
```

**Step 2: Commit**

```bash
git add src/lib/legal/versions.ts
git commit -m "feat(legal): POLICY_VERSION constant for acknowledgement gating"
```

---

## Task 2: Acknowledgement module (TDD)

**Files:**
- Create: `src/lib/legal/acknowledge.ts`
- Create: `src/lib/legal/acknowledge.test.ts`

**Step 1: Failing tests**

```typescript
// src/lib/legal/acknowledge.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAck, saveAck, hasAcknowledgedCurrent } from './acknowledge';
import { POLICY_VERSION } from './versions';

beforeEach(() => {
  localStorage.clear();
});

describe('loadAck', () => {
  it('returns null when key missing', () => {
    expect(loadAck()).toBeNull();
  });

  it('returns the stored version', () => {
    localStorage.setItem('tos-acknowledged-version', '2025-01-01');
    expect(loadAck()).toBe('2025-01-01');
  });

  it('returns null when stored value is empty', () => {
    localStorage.setItem('tos-acknowledged-version', '');
    expect(loadAck()).toBeNull();
  });

  it('returns null when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadAck()).toBeNull();
    spy.mockRestore();
  });
});

describe('saveAck', () => {
  it('writes the version to localStorage', () => {
    saveAck('2026-05-02');
    expect(localStorage.getItem('tos-acknowledged-version')).toBe('2026-05-02');
  });

  it('does not throw when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveAck('2026-05-02')).not.toThrow();
    spy.mockRestore();
  });
});

describe('hasAcknowledgedCurrent', () => {
  it('returns false when nothing stored', () => {
    expect(hasAcknowledgedCurrent()).toBe(false);
  });

  it('returns true when stored version equals POLICY_VERSION', () => {
    saveAck(POLICY_VERSION);
    expect(hasAcknowledgedCurrent()).toBe(true);
  });

  it('returns false when stored version is older', () => {
    saveAck('2025-01-01');
    expect(hasAcknowledgedCurrent()).toBe(false);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```typescript
// src/lib/legal/acknowledge.ts
import { POLICY_VERSION } from './versions';

const KEY = 'tos-acknowledged-version';

export function loadAck(): string | null {
  try {
    const value = localStorage.getItem(KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function saveAck(version: string): void {
  try {
    localStorage.setItem(KEY, version);
  } catch {
    // private mode or quota — best effort
  }
}

export function hasAcknowledgedCurrent(): boolean {
  return loadAck() === POLICY_VERSION;
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/lib/legal/acknowledge.ts src/lib/legal/acknowledge.test.ts
git commit -m "feat(legal): localStorage-backed acknowledgement with version check"
```

---

## Task 3: ConsentInterstitial (TDD)

**Files:**
- Create: `src/components/ConsentInterstitial.tsx`
- Create: `src/components/ConsentInterstitial.test.tsx`

**Step 1: Failing tests**

```typescript
// src/components/ConsentInterstitial.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentInterstitial } from './ConsentInterstitial';

describe('ConsentInterstitial', () => {
  it('renders heading and a disabled Continue button initially', () => {
    render(<ConsentInterstitial onAccept={() => {}} />);
    expect(screen.getByRole('heading', { name: /before you continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('renders policy and ToS links that open in a new tab', () => {
    render(<ConsentInterstitial onAccept={() => {}} />);
    const privacy = screen.getByRole('link', { name: /privacy policy/i });
    const terms = screen.getByRole('link', { name: /terms of service/i });
    expect(privacy).toHaveAttribute('href', '/privacy');
    expect(privacy).toHaveAttribute('target', '_blank');
    expect(privacy).toHaveAttribute('rel', 'noopener noreferrer');
    expect(terms).toHaveAttribute('href', '/terms');
    expect(terms).toHaveAttribute('target', '_blank');
    expect(terms).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('enables Continue once the checkbox is ticked', async () => {
    render(<ConsentInterstitial onAccept={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });

  it('fires onAccept when Continue is clicked after ticking the box', async () => {
    const onAccept = vi.fn();
    render(<ConsentInterstitial onAccept={onAccept} />);
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onAccept).toHaveBeenCalled();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/ConsentInterstitial.tsx
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
          Please read how we handle your data and what this service does and does
          not do.
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
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/ConsentInterstitial.tsx src/components/ConsentInterstitial.test.tsx
git commit -m "feat(ui): ConsentInterstitial — checkbox-gated Continue, links to legal pages"
```

---

## Task 4: ConsentGate (TDD)

**Files:**
- Create: `src/components/ConsentGate.tsx`
- Create: `src/components/ConsentGate.test.tsx`

**Step 1: Failing tests**

```typescript
// src/components/ConsentGate.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentGate } from './ConsentGate';
import { POLICY_VERSION } from '@/lib/legal/versions';

beforeEach(() => {
  localStorage.clear();
});

describe('ConsentGate', () => {
  it('renders the interstitial when no acknowledgement exists', () => {
    render(
      <ConsentGate>
        <p>protected</p>
      </ConsentGate>,
    );
    expect(screen.getByRole('heading', { name: /before you continue/i })).toBeInTheDocument();
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });

  it('renders children when current ack is stored', () => {
    localStorage.setItem('tos-acknowledged-version', POLICY_VERSION);
    render(
      <ConsentGate>
        <p>protected</p>
      </ConsentGate>,
    );
    expect(screen.getByText('protected')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /before you continue/i })).not.toBeInTheDocument();
  });

  it('renders interstitial when stored version is stale', () => {
    localStorage.setItem('tos-acknowledged-version', '2024-01-01');
    render(
      <ConsentGate>
        <p>protected</p>
      </ConsentGate>,
    );
    expect(screen.getByRole('heading', { name: /before you continue/i })).toBeInTheDocument();
  });

  it('swaps to children after Continue is clicked', async () => {
    render(
      <ConsentGate>
        <p>protected</p>
      </ConsentGate>,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('protected')).toBeInTheDocument();
    expect(localStorage.getItem('tos-acknowledged-version')).toBe(POLICY_VERSION);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/ConsentGate.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ConsentInterstitial } from './ConsentInterstitial';
import { hasAcknowledgedCurrent, saveAck } from '@/lib/legal/acknowledge';
import { POLICY_VERSION } from '@/lib/legal/versions';

export function ConsentGate({ children }: { children: ReactNode }) {
  // Start with `null` to avoid SSR/CSR mismatch — first paint is empty,
  // then the effect resolves the actual ack state.
  const [acknowledged, setAcknowledged] = useState<boolean | null>(null);

  useEffect(() => {
    setAcknowledged(hasAcknowledgedCurrent());
  }, []);

  function handleAccept() {
    saveAck(POLICY_VERSION);
    setAcknowledged(true);
  }

  if (acknowledged === null) return null;
  if (!acknowledged) return <ConsentInterstitial onAccept={handleAccept} />;
  return <>{children}</>;
}
```

**Step 4: Run** → the test "renders the interstitial when no acknowledgement exists" may fail because the initial paint is `null` (renders nothing). Update the test or have the gate resolve synchronously in jsdom. Easier: have `useState` initialiser be `hasAcknowledgedCurrent()` directly — safe because in this app the entire `<ConsentGate>` lives under `'use client'` and inside `<AuthGate>`, which has already gated rendering on a client-side session check. SSR cannot reach this component.

Revised implementation:

```tsx
export function ConsentGate({ children }: { children: ReactNode }) {
  const [acknowledged, setAcknowledged] = useState(() => {
    if (typeof window === 'undefined') return false;
    return hasAcknowledgedCurrent();
  });

  function handleAccept() {
    saveAck(POLICY_VERSION);
    setAcknowledged(true);
  }

  if (!acknowledged) return <ConsentInterstitial onAccept={handleAccept} />;
  return <>{children}</>;
}
```

This renders synchronously on the client, no flash, no extra state branch.

**Step 5: Run** → PASS (all four tests).

**Step 6: Commit**

```bash
git add src/components/ConsentGate.tsx src/components/ConsentGate.test.tsx
git commit -m "feat(ui): ConsentGate — wraps children behind versioned ack check"
```

---

## Task 5: Footer (TDD)

**Files:**
- Create: `src/components/Footer.tsx`
- Create: `src/components/Footer.test.tsx`

**Step 1: Failing tests**

```typescript
// src/components/Footer.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders Privacy and Terms links with correct hrefs', () => {
    render(<Footer />);
    const privacy = screen.getByRole('link', { name: /privacy/i });
    const terms = screen.getByRole('link', { name: /terms/i });
    expect(privacy).toHaveAttribute('href', '/privacy');
    expect(terms).toHaveAttribute('href', '/terms');
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implementation**

```tsx
// src/components/Footer.tsx
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mx-auto mt-12 flex max-w-7xl flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
      <Link href="/privacy" className="underline hover:text-slate-700">
        Privacy
      </Link>
      <Link href="/terms" className="underline hover:text-slate-700">
        Terms
      </Link>
    </footer>
  );
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/components/Footer.tsx src/components/Footer.test.tsx
git commit -m "feat(ui): Footer with Privacy and Terms links"
```

---

## Task 6: Privacy policy page

**Files:**
- Create: `src/app/privacy/page.tsx`

**Step 1: Implementation**

```tsx
// src/app/privacy/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Medical Report Companion',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-slate-600 underline">
        ← Back
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: 2026-05-02</p>

      <div className="mt-4 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        This document is a starting draft. It has not yet been reviewed by a lawyer.
        Before relying on this service for personal data decisions, please contact us
        with any questions.
      </div>

      <Section title="Who we are">
        <p>
          Medical Report Companion is provided by [ENTITY_NAME] ("we", "us"). We are
          based in [JURISDICTION]. You can reach our privacy contact at{' '}
          <a href="mailto:[CONTACT_EMAIL]" className="underline">
            [CONTACT_EMAIL]
          </a>
          .
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-disc pl-5">
          <li>Authentication metadata from Google sign-in (email, name, profile photo URL).</li>
          <li>The text content of medical reports you upload, after our OCR step.</li>
          <li>Plain-language summaries we generate, and your follow-up chat messages.</li>
          <li>Your language preference and consent toggle states.</li>
          <li>Your approximate location, only when you open the "Find nearby" page and grant browser permission. We do not store this; we use it only to query Google Places and discard it after the request.</li>
        </ul>
        <p className="mt-2">
          We never store the original uploaded file; only the extracted text. We never
          store voice recordings.
        </p>
      </Section>

      <Section title="Where it is stored">
        <p>
          All data is stored in Supabase managed PostgreSQL in the Mumbai region
          (ap-south-1). Row-Level Security policies restrict each row to the user it
          belongs to.
        </p>
      </Section>

      <Section title="Who can access it">
        <p>
          Only you can read your reports and chat history. Our team has administrative
          access to the database for incident response, but does not routinely view
          report or chat content.
        </p>
      </Section>

      <Section title="Third parties involved in processing">
        <p>
          To deliver the service, we send relevant data to the following processors.
          None receives your name or email.
        </p>
        <ul className="list-disc pl-5">
          <li>
            <strong>Google Cloud Vision</strong> — receives the bytes of your uploaded
            file to extract text.
          </li>
          <li>
            <strong>Google Cloud Translate</strong> — receives extracted text for
            translation between English and your chosen Indian language.
          </li>
          <li>
            <strong>Groq</strong> — receives extracted text and your chat questions to
            generate plain-language summaries and replies.
          </li>
          <li>
            <strong>Google Maps Platform</strong> — receives your geolocation only when
            you open the "Find nearby" page.
          </li>
        </ul>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your data until you delete it. You can delete an individual report
          (and its chat history) from the sidebar at any time. To request full deletion
          of your account, email{' '}
          <a href="mailto:[CONTACT_EMAIL]" className="underline">
            [CONTACT_EMAIL]
          </a>
          .
        </p>
      </Section>

      <Section title="Your rights under DPDP">
        <p>
          Under India's Digital Personal Data Protection Act 2023 you have the right
          to access your data, correct it, request its deletion, and withdraw consent.
          You can exercise most of these rights in-app via the Settings page and the
          per-report delete button. For anything else, write to{' '}
          <a href="mailto:[CONTACT_EMAIL]" className="underline">
            [CONTACT_EMAIL]
          </a>
          .
        </p>
      </Section>

      <Section title="Children">
        <p>This service is not intended for users under the age of 18.</p>
      </Section>

      <Section title="International transfers">
        <p>
          Your data is stored in Mumbai. The processors listed above operate
          internationally; their handling of any data we send is governed by their own
          privacy policies.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          When we change this policy materially, we will ask you to re-acknowledge it
          on your next sign-in. The version date at the top of this page reflects the
          most recent change.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-medium text-slate-900">{title}</h2>
      <div className="mt-2 text-base leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
```

**Step 2: Verify build**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/app/privacy/page.tsx
git commit -m "feat(legal): /privacy page — DPDP-aware draft with placeholders"
```

---

## Task 7: Terms of Service page

**Files:**
- Create: `src/app/terms/page.tsx`

**Step 1: Implementation**

```tsx
// src/app/terms/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Medical Report Companion',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-slate-600 underline">
        ← Back
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-slate-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: 2026-05-02</p>

      <div className="mt-4 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        This document is a starting draft. It has not yet been reviewed by a lawyer.
        Use the service only if you accept these terms as written.
      </div>

      <Section title="1. Acceptance">
        <p>
          By using Medical Report Companion you agree to these terms. If you do not
          agree, do not use the service.
        </p>
      </Section>

      <Section title="2. Service description">
        <p>
          Medical Report Companion lets you upload a medical report, receive a
          plain-language summary in your chosen language, and ask follow-up questions
          about the report. It can also help you find nearby labs and hospitals.
        </p>
      </Section>

      <div className="mt-8 rounded-md border-2 border-red-300 bg-red-50 p-5">
        <h2 className="text-lg font-semibold text-red-900">3. Important: this is not medical advice</h2>
        <p className="mt-2 text-sm text-red-900">
          Summaries and chat replies are educational. They are not a diagnosis,
          treatment recommendation, or a substitute for a qualified healthcare
          provider. Do not stop, start, or change any medication based on what this
          service tells you. In an emergency, contact your local emergency services or
          a hospital directly.
        </p>
      </div>

      <Section title="4. Eligibility">
        <p>You must be at least 18 years old to use this service.</p>
      </Section>

      <Section title="5. Account responsibilities">
        <p>
          You sign in with Google. You are responsible for keeping your Google account
          secure. We have no access to your Google credentials.
        </p>
      </Section>

      <Section title="6. Acceptable use">
        <ul className="list-disc pl-5">
          <li>Do not upload reports that are not yours, unless the patient has authorised you.</li>
          <li>Do not use the service for emergency triage.</li>
          <li>Do not attempt to circumvent rate limits or abuse the service.</li>
          <li>Do not use the service to generate or distribute fraudulent documents.</li>
        </ul>
      </Section>

      <Section title="7. Your content">
        <p>
          The content of reports you upload remains yours. By using the service you
          grant us a limited licence to store, process, and display that content back
          to you so the product can function. We do not use your content to train any
          model.
        </p>
      </Section>

      <Section title="8. Limitations of liability">
        <p>
          The service is provided "as is", without warranty of any kind, express or
          implied, including but not limited to warranties of merchantability, fitness
          for a particular purpose, or accuracy of medical information. To the maximum
          extent permitted by law, our total liability arising out of or in connection
          with your use of the service is limited to the greater of any fees you have
          paid us in the preceding 12 months and INR 1,000.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>
          You can stop using the service at any time. To delete a report and its chat
          history, use the delete button in the history sidebar. To request full
          account closure, write to{' '}
          <a href="mailto:[CONTACT_EMAIL]" className="underline">
            [CONTACT_EMAIL]
          </a>
          . We may suspend your access if you breach these terms.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>
          These terms are governed by the laws of [JURISDICTION]. Any dispute will be
          resolved by the courts of [JURISDICTION].
        </p>
      </Section>

      <Section title="11. Changes">
        <p>
          We may update these terms. When we do, we will ask you to re-acknowledge
          them on your next sign-in.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          [ENTITY_NAME], [JURISDICTION].{' '}
          <a href="mailto:[CONTACT_EMAIL]" className="underline">
            [CONTACT_EMAIL]
          </a>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-medium text-slate-900">{title}</h2>
      <div className="mt-2 text-base leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
```

**Step 2: Verify build**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/app/terms/page.tsx
git commit -m "feat(legal): /terms page — service description + not-medical-advice box + placeholders"
```

---

## Task 8: Wire ConsentGate + Footer into authenticated pages

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/nearby/page.tsx`

**Step 1: Modify each authenticated page**

Each page already wraps its content in `<AuthGate>`. We add `<ConsentGate>` immediately inside, and a `<Footer>` at the end of the main element.

For `src/app/page.tsx`:

```tsx
// at the top, add imports:
import { ConsentGate } from '@/components/ConsentGate';
import { Footer } from '@/components/Footer';

// existing default export changes:
export default function Page() {
  return (
    <AuthGate>
      <ConsentGate>
        <HomeContent />
        <Footer />
      </ConsentGate>
    </AuthGate>
  );
}
```

For `src/app/settings/page.tsx`:

```tsx
import { ConsentGate } from '@/components/ConsentGate';
import { Footer } from '@/components/Footer';

export default function SettingsPage() {
  return (
    <AuthGate>
      <ConsentGate>
        <SettingsContent />
        <Footer />
      </ConsentGate>
    </AuthGate>
  );
}
```

For `src/app/nearby/page.tsx`:

```tsx
import { ConsentGate } from '@/components/ConsentGate';
import { Footer } from '@/components/Footer';

// inside the default export — wrap APIProvider in ConsentGate:
export default function NearbyPage() {
  return (
    <AuthGate>
      <ConsentGate>
        <APIProvider apiKey={config.apiKey} libraries={config.libraries}>
          <NearbyContent />
        </APIProvider>
        <Footer />
      </ConsentGate>
    </AuthGate>
  );
}
```

**Step 2: Verify**

```bash
pnpm test && pnpm lint && pnpm build
```

All green.

**Step 3: Commit**

```bash
git add src/app/page.tsx src/app/settings/page.tsx src/app/nearby/page.tsx
git commit -m "feat(ui): wrap authenticated pages in ConsentGate + render Footer"
```

---

## Task 9: Final smoke + PR

**Step 1: Manual smoke**

```bash
pnpm dev
```

1. Sign in fresh (or clear `localStorage.tos-acknowledged-version`) → see consent interstitial.
2. Click "Privacy Policy" link → opens in new tab; legal copy renders with placeholders visible.
3. Click "Terms of Service" link → opens in new tab; not-medical-advice box prominent.
4. Return to interstitial → tick checkbox → Continue → land on `/`.
5. Refresh → no interstitial.
6. Visit `/settings` and `/nearby` → no interstitial; Footer with both links visible at the bottom.
7. Open `/privacy` and `/terms` directly while signed out → content renders without auth prompt.
8. In DevTools, set `localStorage.tos-acknowledged-version = "2024-01-01"` → reload `/` → interstitial shows again.
9. After accepting, visit `/settings` Display section → toggle Large → footer text bumps with the rest.

**Step 2: Push branch**

```bash
git push -u origin feat/compliance-copy
```

**Step 3: Open PR**

```bash
gh pr create --base master \
  --title "feat: compliance copy (Phase 8) — privacy, terms, consent gate, footer" \
  --body "$(cat <<'EOF'
## Summary
- New \`/privacy\` and \`/terms\` static pages with reasonable starting drafts. Both pages are public — readable without sign-in.
- First-time **consent gate** after sign-in: an interstitial asks the user to read both documents and acknowledge before reaching the rest of the app. Versioned in \`localStorage\`; bumping \`POLICY_VERSION\` forces re-acknowledgement.
- **Footer** with Privacy + Terms links on every authenticated page (\`/\`, \`/settings\`, \`/nearby\`).
- Both legal pages contain a prominent \"draft, not lawyer-reviewed\" notice. The Terms page has a hard-to-miss \"this is not medical advice\" red box.

## Disclaimer
**I am not a lawyer.** The privacy policy and ToS are reasonable drafts informed by DPDP basics and the actual data flows we built (Supabase Mumbai, Google Vision/Translate, Groq, Google Places). Have them reviewed by an actual lawyer before any public launch.

## Placeholders to find/replace before launch
- \`[CONTACT_EMAIL]\` — privacy contact / data-request inbox.
- \`[JURISDICTION]\` — governing-law jurisdiction.
- \`[ENTITY_NAME]\` — natural-person or company entity providing the service.

\`grep -rn '\\[CONTACT_EMAIL\\|\\[JURISDICTION\\|\\[ENTITY_NAME' src/app/privacy src/app/terms\` lists every site.

## Design + plan
- \`docs/plans/2026-05-02-compliance-copy-design.md\`
- \`docs/plans/2026-05-02-compliance-copy.md\`

## What changed
- \`src/lib/legal/versions.ts\` — \`POLICY_VERSION\` constant.
- \`src/lib/legal/acknowledge.ts\` — \`loadAck\`, \`saveAck\`, \`hasAcknowledgedCurrent\` over localStorage with safe fallbacks.
- \`src/components/ConsentInterstitial.tsx\` — checkbox-gated Continue, links to legal pages.
- \`src/components/ConsentGate.tsx\` — wraps children behind versioned ack check.
- \`src/components/Footer.tsx\` — Privacy + Terms links.
- \`src/app/privacy/page.tsx\` — privacy policy.
- \`src/app/terms/page.tsx\` — Terms of Service with not-medical-advice box.
- \`src/app/page.tsx\`, \`src/app/settings/page.tsx\`, \`src/app/nearby/page.tsx\` — wrapped in \`<ConsentGate>\`; mount \`<Footer>\`.

## Tests
~133 pass (≈9 new across acknowledge, ConsentInterstitial, ConsentGate, Footer).

## Test plan
- [ ] \`pnpm install && pnpm test\`
- [ ] \`pnpm build\`
- [ ] Fresh sign-in (or clear \`localStorage.tos-acknowledged-version\`) → see interstitial
- [ ] Open privacy + terms via interstitial links → both render
- [ ] Tick + Continue → land on \`/\`; refresh → no interstitial
- [ ] Footer visible on \`/\`, \`/settings\`, \`/nearby\`; both links work
- [ ] \`/privacy\` and \`/terms\` directly while signed out → no auth prompt
- [ ] Set localStorage version to an old date → interstitial returns on next reload

## Out of scope (next PRs)
- "Download my data" export.
- Bulk delete / account closure.
- DB-backed acknowledgement audit trail.
- Phase 6 — voice (STT + TTS).
- Phase 9 — Playwright E2E.
EOF
)"
```

---

## Done definition

- All 9 tasks committed.
- `pnpm test` passes.
- `pnpm build` succeeds.
- Manual smoke confirms first-time gate, footer, and public legal page access.
- PR open against `master`.
