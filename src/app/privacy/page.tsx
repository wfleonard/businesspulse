import type { Metadata } from 'next'
import Link from 'next/link'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'

// The contact address comes from the environment at request time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Privacy | BusinessPulse',
}

const LAST_UPDATED = 'September 18, 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-dark">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  const contact = process.env.AEO_CONTACT_EMAIL

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href="/" className="text-sm text-primary hover:underline">
        BusinessPulse
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-dark">Privacy</h1>
      <p className="mt-2 text-sm text-text-secondary">Last updated {LAST_UPDATED}</p>

      <Section title="What we collect">
        <p>
          When you request a snapshot: your business name, website, main service, city, state, industry,
          and email address, plus the IP address the request came from and whether you agreed to be
          contacted. We also store the AI answers gathered for your report.
        </p>
      </Section>

      <Section title="Why">
        <ul className="list-disc space-y-1 pl-5">
          <li>To confirm your email address and send you your report.</li>
          <li>To build the report, by asking AI search questions about your service and area.</li>
          <li>To prevent abuse, using your IP address and a Cloudflare Turnstile bot check.</li>
          <li>To follow up about your results, only if you ticked the contact box.</li>
          <li>
            To publish anonymized statistics by industry, such as how often businesses&apos; own websites are cited.
            They never name a business, and an industry is published only once at least 10 businesses in it have been
            measured.
          </li>
        </ul>
      </Section>

      <Section title="Who else sees it">
        <p>
          The questions we ask Perplexity include your business name, service, and location. Your email
          address and IP address are never sent to it. Emails are delivered through Mailtrap. Cloudflare
          runs the bot check on the request form.
        </p>
        <p>
          Our home page and this page use Google Analytics, which sets cookies, to count visits and see how
          people find us. It doesn&apos;t run on report pages, confirmation links, or anything you enter in
          the form.
        </p>
        <p>
          Your report has a private, unguessable link. It isn&apos;t listed or indexed, but anyone you
          share the link with can view it.
        </p>
        <p>We don&apos;t sell your information.</p>
      </Section>

      <Section title="How long we keep it, and deleting it">
        <p>
          We keep requests and reports until you ask us to delete them.
          {contact ? (
            <>
              {' '}
              To delete yours, email{' '}
              <a href={`mailto:${contact}`} className="text-primary hover:underline">
                {contact}
              </a>{' '}
              from the address you used, and we&apos;ll remove the request and its report.
            </>
          ) : (
            ' To delete yours, reply to any email we sent you and we’ll remove the request and its report.'
          )}
        </p>
      </Section>
      <GoogleAnalytics />
    </main>
  )
}
