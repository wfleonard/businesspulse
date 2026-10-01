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
