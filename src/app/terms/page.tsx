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
        <h2 className="text-lg font-semibold text-red-900">
          3. Important: this is not medical advice
        </h2>
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
          <li>
            Do not upload reports that are not yours, unless the patient has authorised
            you.
          </li>
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
          The service is provided &quot;as is&quot;, without warranty of any kind,
          express or implied, including but not limited to warranties of
          merchantability, fitness for a particular purpose, or accuracy of medical
          information. To the maximum extent permitted by law, our total liability
          arising out of or in connection with your use of the service is limited to
          the greater of any fees you have paid us in the preceding 12 months and INR
          1,000.
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
