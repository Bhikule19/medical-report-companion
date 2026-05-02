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
          Medical Report Companion is provided by [ENTITY_NAME] (&quot;we&quot;,
          &quot;us&quot;). We are based in [JURISDICTION]. You can reach our privacy
          contact at{' '}
          <a href="mailto:[CONTACT_EMAIL]" className="underline">
            [CONTACT_EMAIL]
          </a>
          .
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-disc pl-5">
          <li>
            Authentication metadata from Google sign-in (email, name, profile photo URL).
          </li>
          <li>The text content of medical reports you upload, after our OCR step.</li>
          <li>Plain-language summaries we generate, and your follow-up chat messages.</li>
          <li>Your language preference and consent toggle states.</li>
          <li>
            Your approximate location, only when you open the &quot;Find nearby&quot;
            page and grant browser permission. We do not store this; we use it only to
            query Google Places and discard it after the request.
          </li>
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
            <strong>Google Maps Platform</strong> — receives your geolocation only
            when you open the &quot;Find nearby&quot; page.
          </li>
        </ul>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your data until you delete it. You can delete an individual report
          (and its chat history) from the sidebar at any time. To request full
          deletion of your account, email{' '}
          <a href="mailto:[CONTACT_EMAIL]" className="underline">
            [CONTACT_EMAIL]
          </a>
          .
        </p>
      </Section>

      <Section title="Your rights under DPDP">
        <p>
          Under India&apos;s Digital Personal Data Protection Act 2023 you have the
          right to access your data, correct it, request its deletion, and withdraw
          consent. You can exercise most of these rights in-app via the Settings page
          and the per-report delete button. For anything else, write to{' '}
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
