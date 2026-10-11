/**
 * Starter follow-up templates for snapshot leads who ticked "You can contact
 * me about improving these results". `npm run aeo:panels` adds any missing by
 * slug and never changes existing ones, so edits in /dashboard/email survive.
 *
 * Every email gets the unsubscribe footer automatically (mail-format.ts), so
 * templates don't include one. Copy avoids em dashes, like the other emails.
 *
 * Written 2026-10-11 as starting points; rework them in the dashboard.
 */
export type MailTemplateSeed = {
  slug: string
  name: string
  description: string
  subject: string
  body: string
}

const SIGNATURE = `Best,

Bill Leonard
Saxon AEO`

export const MAIL_TEMPLATES: MailTemplateSeed[] = [
  {
    slug: 'next-steps',
    name: 'Next steps after the report',
    description: 'First follow-up, 2 to 5 days after the report.',
    subject: 'Your AI visibility report for @domain',
    body: `Hi,

Thanks for running a free AI visibility snapshot for @business. AI search cited @domain on @score buyer questions, and your full report is here: [view your report](@report_url)

The questions where other sites were cited instead are usually the quickest wins. I'd be glad to walk you through what is driving those answers and what would change them.

If a 20 minute call works, you can pick a time here: [book a call](@book_url)

${SIGNATURE}`,
  },
  {
    slug: 'saxon-aeo-intro',
    name: 'How Saxon AEO works',
    description: 'For leads who opened the report or asked what the service includes.',
    subject: 'How Saxon AEO improves @domain in AI search',
    body: `Hi,

Following up on your snapshot for @business. Saxon AEO is the service behind it: each month we ask AI search the same buyer questions, fix what keeps it from citing your site, and report what moved.

Core is $1,500 a month on a 6 month term. We are taking 2 or 3 founding clients at $1,000 a month plus $500 onboarding. A full audit of @domain is included when you book a call.

[Book a call](@book_url)

${SIGNATURE}`,
  },
  {
    slug: 'check-in',
    name: 'Check-in, no reply yet',
    description: 'About a week after an email that got no reply.',
    subject: 'Checking in on @business',
    body: `Hi,

Hope the week is going well. Wanted to check whether you had a chance to look at the AI visibility report for @domain: [view your report](@report_url)

Happy to answer any questions about it, even if you plan to handle the fixes yourself. Just reply to this email.

${SIGNATURE}`,
  },
  {
    slug: 'fresh-look',
    name: 'Offer a fresh look',
    description: 'A few weeks later, to restart the conversation.',
    subject: 'A fresh look at @domain in AI search',
    body: `Hi,

It has been a few weeks since your snapshot for @business, when AI search cited @domain on @score buyer questions. AI answers shift from month to month, so I can ask the same questions again and show you what changed, at no charge.

Reply yes and I will send you the new report.

${SIGNATURE}`,
  },
]
