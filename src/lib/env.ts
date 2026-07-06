/**
 * Centralized environment access.
 *
 * Values are read lazily (via getters) so that importing a module that needs a
 * secret does not crash `next build` or unit tests when the secret is absent.
 * Call these at request/job time, not at module load.
 */

export function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required environment variable: ${name}`)
  return val
}

export function optionalEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback
}

/** True in a real deployment where secrets must be present. */
export const isProd = process.env.NODE_ENV === 'production'
