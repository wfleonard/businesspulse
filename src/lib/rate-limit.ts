import { getRedis } from './redis'

export type RateLimitResult = {
  success: boolean
  remaining: number
  limit: number
  resetSeconds: number
  /** Set when Redis was unreachable and `failClosed` denied the request, so callers can say "try again shortly" rather than "over the limit". */
  unavailable?: boolean
}

export type RateLimitOptions = {
  /**
   * Deny instead of allow when Redis is unreachable. Use on paths that spend
   * money, where an outage must not remove every limit.
   */
  failClosed?: boolean
}

/** How long to wait on Redis. The client retries forever, so without this an outage hangs the request. */
const REDIS_TIMEOUT_MS = 2000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Redis did not respond within ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Fixed-window rate limiter backed by Redis.
 *
 * Uses INCR + EXPIRE on a per-key, per-window bucket. Simple and cheap — good
 * enough to blunt auth brute-force and AI-cost abuse. Fails OPEN if Redis is
 * unreachable so an outage doesn't lock users out (log-and-allow), unless
 * `failClosed` is set.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000)
  const window = Math.floor(now / windowSeconds)
  const redisKey = `rl:${key}:${window}`

  try {
    const redis = getRedis()
    const count = await withTimeout(redis.incr(redisKey), REDIS_TIMEOUT_MS)
    if (count === 1) {
      await withTimeout(redis.expire(redisKey, windowSeconds), REDIS_TIMEOUT_MS)
    }
    const remaining = Math.max(0, limit - count)
    return {
      success: count <= limit,
      remaining,
      limit,
      resetSeconds: (window + 1) * windowSeconds - now,
    }
  } catch (err) {
    if (options.failClosed) {
      console.error('rateLimit: Redis error, failing closed', err)
      return { success: false, remaining: 0, limit, resetSeconds: windowSeconds, unavailable: true }
    }
    console.error('rateLimit: Redis error, failing open', err)
    return { success: true, remaining: limit, limit, resetSeconds: windowSeconds }
  }
}

/** Best-effort client IP from standard proxy headers. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
