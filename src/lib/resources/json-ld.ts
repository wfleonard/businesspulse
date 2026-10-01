import { appUrl } from '@/lib/aeo/emails'
import type { LocalProvider } from './types'

/**
 * Structured data for Resource Hub pages. The JSON is escaped so no value can
 * close the <script> element it's written into.
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

const publisher = () => ({
  '@type': 'Organization',
  '@id': appUrl('/#organization'),
  name: 'BusinessPulse',
  url: appUrl('/'),
  logo: appUrl('/business-pulse-logo.webp'),
})

export function articleJsonLd(args: {
  path: string
  title: string
  description: string
  published: Date
  modified?: Date
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: args.title,
    description: args.description,
    url: appUrl(args.path),
    mainEntityOfPage: appUrl(args.path),
    datePublished: args.published.toISOString(),
    dateModified: (args.modified ?? args.published).toISOString(),
    author: publisher(),
    publisher: publisher(),
  }
}

export function faqJsonLd(faq: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}

/** A service-area business: no street address, so the town is its only location. */
export function localProviderJsonLd(path: string, provider: LocalProvider) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': appUrl(`${path}#provider`),
    name: provider.name,
    ...(provider.legalName && { legalName: provider.legalName }),
    description: provider.description,
    url: appUrl(path),
    telephone: provider.telephone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: provider.locality,
      addressRegion: provider.region,
      postalCode: provider.postalCode,
      addressCountry: 'US',
    },
    areaServed: provider.areaServed.map((name) => ({ '@type': 'Place', name })),
    brand: { '@id': appUrl('/#organization') },
  }
}

/** What BusinessPulse is, in one sentence. The default meta description and the Organization description. */
export const SITE_DESCRIPTION =
  'BusinessPulse shows whether AI search cites your business: a free snapshot asks real buyer questions for your industry and area and reports who gets cited when you don’t.'

/**
 * BusinessPulse's profiles on other sites (LinkedIn, Product Hunt, G2, and so
 * on). Listing them as sameAs tells search engines and assistants they are all
 * the same business. Add each one as it goes live.
 */
export const SAME_AS: string[] = []

/** The full Organization, on the homepage. Other pages refer to it by @id through publisher(). */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    ...publisher(),
    description: SITE_DESCRIPTION,
    ...(SAME_AS.length > 0 && { sameAs: SAME_AS }),
    founder: { '@type': 'Person', name: 'Bill Leonard' },
    parentOrganization: {
      '@type': 'Organization',
      name: 'Saxon Enterprises Inc',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Tinton Falls',
        addressRegion: 'NJ',
        postalCode: '07724',
        addressCountry: 'US',
      },
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: '+17326734260',
      areaServed: 'US',
      availableLanguage: 'English',
    },
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': appUrl('/#website'),
    name: 'BusinessPulse',
    url: appUrl('/'),
    publisher: { '@id': appUrl('/#organization') },
  }
}
