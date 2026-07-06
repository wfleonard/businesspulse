import { getRedis } from './redis'

export type RateLimitResult = {
  success: boolean
  remaining: number
  limit: number
  resetSeconds: number
}

/**
 * Fixed-window rate limiter backed by Redis.
 *
 * Uses INCR + EXPIRE on a per-key, per-window bucket. Simple and cheap — good
 * enough to blunt auth brute-force and AI-cost abuse. Fails OPEN if Redis is
 * unreachable so an outage doesn't lock users out (log-and-allow).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000)
  const window = Math.floor(now / windowSeconds)
  const redisKey = `rl:${key}:${window}`

  try {
    const redis = getRedis()
    const count = await redis.incr(redisKey)
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds)
    }
    const remaining = Math.max(0, limit - count)
    return {
      success: count <= limit,
      remaining,
      limit,
      resetSeconds: (window + 1) * windowSeconds - now,
    }
  } catch (err) {
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
