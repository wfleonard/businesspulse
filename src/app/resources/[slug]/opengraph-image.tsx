import { SHARE_IMAGE_SIZE, shareImage } from '@/components/site/ShareImage'
import { findArticle, RESOURCE_TYPE_LABELS } from '@/lib/resources'

export const alt = 'BusinessPulse resource'
export const size = SHARE_IMAGE_SIZE
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const article = findArticle((await params).slug)
  if (!article) return shareImage({ eyebrow: 'Resources', title: 'How AI search answers buyers' })
  return shareImage({ eyebrow: RESOURCE_TYPE_LABELS[article.type], title: article.title })
}
