import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { JsonLd } from '@/components/resources/JsonLd'
import { SnapshotCta } from '@/components/resources/SnapshotCta'
import { PublicHeader } from '@/components/site/PublicHeader'
import { appUrl } from '@/lib/aeo/emails'
import {
  articleDate,
  articleDescription,
  articleTitleTag,
  findArticle,
  formatDay,
  industryName,
  RESOURCE_TYPE_LABELS,
} from '@/lib/resources'
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, localProviderJsonLd } from '@/lib/resources/json-ld'
import { renderMarkdown } from '@/lib/resources/markdown'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = findArticle((await params).slug)
  if (!article) return {}
  const url = appUrl(`/resources/${article.slug}`)
  return {
    title: articleTitleTag(article),
    description: articleDescription(article),
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: articleDescription(article),
      url,
      type: 'article',
      publishedTime: articleDate(article.published).toISOString(),
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const article = findArticle((await params).slug)
  if (!article) notFound()

  const published = articleDate(article.published)
  const updated = article.updated ? articleDate(article.updated) : null
  const industries = article.industries.map((slug) => ({ slug, name: industryName(slug) })).filter((i) => i.name)

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <Link href="/resources" className="text-sm text-primary hover:underline">
          Resources
        </Link>
        <p className="mt-4 text-xs text-text-secondary">
          {RESOURCE_TYPE_LABELS[article.type]} · {formatDay(published)}
          {updated && ` · Updated ${formatDay(updated)}`}
          {article.draft && ' · Draft'}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-dark sm:text-4xl">{article.title}</h1>
        <p className="mt-4 text-lg text-text-secondary">{article.summary}</p>
        {article.image && (
          <Image
            src={article.image.src}
            alt={article.image.alt}
            width={1200}
            height={675}
            sizes="(min-width: 768px) 48rem, 100vw"
            preload
            className="mt-6 h-auto w-full rounded-2xl"
          />
        )}

        <article className="prose-bp mt-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }} />

        {industries.length > 0 && (
          <p className="mt-8 text-sm text-text-secondary">
            For:{' '}
            {industries.map((i, index) => (
              <span key={i.slug}>
                {index > 0 && ', '}
                <Link href={`/resources?industry=${i.slug}`} className="text-primary hover:underline">
                  {i.name}
                </Link>
              </span>
            ))}
          </p>
        )}

        <SnapshotCta />
      </main>
      <JsonLd
        data={articleJsonLd({
          path: `/resources/${article.slug}`,
          title: article.title,
          description: article.summary,
          published,
          modified: updated ?? undefined,
          image: article.image?.src,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Resources', path: '/resources' },
          { name: article.title, path: `/resources/${article.slug}` },
        ])}
      />
      {article.faq && article.faq.length > 0 && <JsonLd data={faqJsonLd(article.faq)} />}
      {article.localProvider && (
        <JsonLd data={localProviderJsonLd(`/resources/${article.slug}`, article.localProvider)} />
      )}
      <GoogleAnalytics />
    </div>
  )
}
