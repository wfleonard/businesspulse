import { SHARE_IMAGE_SIZE, shareImage } from '@/components/site/ShareImage'
import { loadBenchmark } from '@/lib/resources/benchmarks'

export const alt = 'BusinessPulse industry benchmark'
export const size = SHARE_IMAGE_SIZE
export const contentType = 'image/png'

// The benchmark comes from the database, so the image is drawn per request.
export const dynamic = 'force-dynamic'

export default async function Image({ params }: { params: Promise<{ industry: string }> }) {
  const benchmark = await loadBenchmark((await params).industry)
  const title = benchmark
    ? `How AI search answers ${benchmark.name.toLowerCase()} buyers`
    : 'How AI search answers buyers, industry by industry'
  return shareImage({ eyebrow: 'Industry benchmark', title })
}
