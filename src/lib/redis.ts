import Redis from 'ioredis'

/**
 * Lazy singleton ioredis client (TCP). Used for the BullMQ queue, short-lived
 * caches, and rate limiting. `lazyConnect` means no socket is opened until the
 * first command, so importing this module never touches the network — safe for
 * `next build` and tests.
 */

let client: Redis | undefined

export function getRedis(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL
    if (!url) throw new Error('Missing required environment variable: REDIS_URL')
    client = new Redis(url, {
      lazyConnect: true,
      // BullMQ requires this to be null; harmless for plain commands too.
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    })
  }
  return client
}
