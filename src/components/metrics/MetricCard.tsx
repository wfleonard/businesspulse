import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { formatValue, formatPct, formatPeriodRange } from '@/lib/metrics/period'
import type { MetricSummary } from '@/lib/metrics/types'

const sentimentClass = {
  good: 'text-success',
  bad: 'text-danger',
  neutral: 'text-text-secondary',
} as const

export function MetricCard({ m }: { m: MetricSummary }) {
  const Icon =
    m.delta.sentiment === 'neutral'
      ? Minus
      : (m.delta.absolute ?? 0) >= 0
        ? ArrowUpRight
        : ArrowDownRight

  return (
    <Link href={`/dashboard/metrics/${m.key}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-text-secondary">{m.label}</span>
        </div>
        <div className="mt-2 text-2xl font-bold text-dark">
          {formatValue(m.current, m.unit)}
        </div>
        <div className={cn('mt-1 flex items-center gap-1 text-sm', sentimentClass[m.delta.sentiment])}>
          <Icon size={16} aria-hidden />
          <span>{formatPct(m.delta.pct)}</span>
          <span className="text-text-secondary">vs prior</span>
        </div>
        <div className="mt-3 text-xs text-text-secondary">
          {formatPeriodRange(m.periodStart, m.periodEnd)}
        </div>
      </Card>
    </Link>
  )
}
