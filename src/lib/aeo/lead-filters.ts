/** Filters for the admin lead list, parsed from the page's query string. */

export const LEAD_STATUSES = ['new', 'contacted', 'won', 'ignored'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export type LeadFilters = {
  /** A canned panel slug, or "generated" for requests without one. */
  vertical?: string
  leadStatus?: LeadStatus
  verified?: boolean
  minCited?: number
  maxCited?: number
}

type Params = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  const text = (Array.isArray(value) ? value[0] : value)?.trim()
  return text || undefined
}

function count(value: string | string[] | undefined): number | undefined {
  const text = first(value)
  if (text === undefined) return undefined
  const n = Number(text)
  return Number.isInteger(n) && n >= 0 && n <= 1000 ? n : undefined
}

/** Unknown or malformed values are ignored rather than rejected: a bad link just shows everything. */
export function parseLeadFilters(params: Params): LeadFilters {
  const filters: LeadFilters = {}

  const vertical = first(params.vertical)
  if (vertical && /^[a-z0-9-]{1,80}$/.test(vertical)) filters.vertical = vertical

  const status = first(params.status)
  if (status && (LEAD_STATUSES as readonly string[]).includes(status)) filters.leadStatus = status as LeadStatus

  const verified = first(params.verified)
  if (verified === 'yes') filters.verified = true
  else if (verified === 'no') filters.verified = false

  const min = count(params.min)
  const max = count(params.max)
  if (min !== undefined) filters.minCited = min
  if (max !== undefined) filters.maxCited = max

  return filters
}

/** The query string for a set of filters, including the leading "?", or "" when empty. */
export function filtersToQuery(filters: LeadFilters): string {
  const params = new URLSearchParams()
  if (filters.vertical) params.set('vertical', filters.vertical)
  if (filters.leadStatus) params.set('status', filters.leadStatus)
  if (filters.verified !== undefined) params.set('verified', filters.verified ? 'yes' : 'no')
  if (filters.minCited !== undefined) params.set('min', String(filters.minCited))
  if (filters.maxCited !== undefined) params.set('max', String(filters.maxCited))
  const query = params.toString()
  return query ? `?${query}` : ''
}
