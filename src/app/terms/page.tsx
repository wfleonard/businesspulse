import type { Metadata } from 'next'
import Link from 'next/link'
import { appUrl } from '@/lib/aeo/emails'

export const metadata: Metadata = {
  title: 'Terms | BusinessPulse',
  description: 'The terms for BusinessPulse accounts and Pulse reports: what a report includes, price and sales tax, the 30-day rule, delivery, and refunds.',
  alternates: { canonical: appUrl('/terms') },
}

const LAST_UPDATED = 'November 9, 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-dark">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href="/" className="text-sm text-primary hover:underline">
        BusinessPulse
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-dark">Terms</h1>
      <p className="mt-2 text-sm text-text-secondary">Last updated {LAST_UPDATED}</p>

      <Section title="Who we are">
        <p>
          BusinessPulse is a service of Saxon Enterprises, Inc., Tinton Falls, New Jersey. Questions about these terms or
          your account: <a href="mailto:wfleonard@saxonenterprises.net" className="text-primary hover:underline">wfleonard@saxonenterprises.net</a>{' '}
          or (732) 673-4260.
        </p>
      </Section>

      <Section title="What a Pulse report is">
        <p>
          A Pulse report asks ChatGPT, Claude, Perplexity, and Gemini the buyer questions approved for your business and
          records whether each answer cites your website, who is cited instead, and what we found on your site. It
          includes a list of changes we suggest.
        </p>
        <p>
          A report shows how those assistants answered on the day it ran. Their answers change as the models and the web
          change, and each assistant decides for itself when to search the web. We don&apos;t control what they say, and
          we don&apos;t promise that any change will make them cite your site. A report says nothing about search engine
          rankings.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          An account is free. Each account covers one business, and you must be able to act for the business you set up.
          Before your first report, we read your website and you confirm what it sells and where it serves; your questions
          are written from that and reviewed by us.
        </p>
      </Section>

      <Section title="Price, tax, and the 30-day rule">
        <p>
          Each Pulse report costs $100. New Jersey sales tax is added for buyers with a New Jersey billing address. You pay
          through Stripe&apos;s checkout page, and Stripe sends your receipt. We never see or store your card number.
        </p>
        <p>
          One business can buy one report every 30 days, counted from the start of its last paid report. There is no
          subscription: you pay only when you choose to run a report.
        </p>
      </Section>

      <Section title="Delivery">
        <p>
          A report starts as soon as your payment is confirmed and usually finishes within an hour. We email you when it is
          ready, and it stays in your account for as long as the account exists.
        </p>
      </Section>

      <Section title="Refunds">
        <p>No refunds once a report has been delivered.</p>
        <p>
          If a paid report fails to finish, we run it again at no charge, or refund it if you ask. A payment that can&apos;t
          start a report, such as a second purchase inside 30 days, is refunded automatically.
        </p>
      </Section>

      <Section title="Fixing what the report finds">
        <p>
          Any work to fix the issues in a report is offered separately. We agree the scope with you and send a quote
          before any work starts.
        </p>
      </Section>

      <Section title="Fair use">
        <p>
          Use BusinessPulse only for businesses you own or work for. We may close an account that is used to harm others,
          misuse the service, or get around these terms.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          BusinessPulse is provided as is. To the extent the law allows, our total liability for any report is limited to
          the amount you paid for it. These terms are governed by the laws of New Jersey.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms. The date at the top shows the latest version, and the version in place when you buy a
          report applies to that report.
        </p>
        <p>
          How we handle your data is described in our{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </Section>
    </main>
  )
}
