import type { AuthConfig, EndpointConfig } from './config'

/** Build request headers for the configured auth scheme. */
export function authHeaders(auth: AuthConfig): Record<string, string> {
  switch (auth.type) {
    case 'apiKey':
      return { [auth.header]: auth.key }
    case 'bearer':
      return { Authorization: `Bearer ${auth.token}` }
    case 'basic':
      return {
        Authorization:
          'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64'),
      }
    case 'none':
    default:
      return {}
  }
}

/** Join a base URL and endpoint path/query into a full URL. */
export function buildUrl(baseUrl: string, endpoint: EndpointConfig): string {
  const base = baseUrl.replace(/\/+$/, '')
  const path = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`
  const url = new URL(base + path)
  if (endpoint.query) {
    for (const [k, v] of Object.entries(endpoint.query)) url.searchParams.set(k, v)
  }
  return url.toString()
}

/** Fetch one endpoint and return parsed JSON. Throws on non-2xx / non-JSON. */
export async function fetchEndpoint(
  baseUrl: string,
  auth: AuthConfig,
  endpoint: EndpointConfig,
  timeoutMs = 20_000
): Promise<unknown> {
  const url = buildUrl(baseUrl, endpoint)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: endpoint.method,
      headers: { Accept: 'application/json', ...authHeaders(auth) },
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} from ${endpoint.path}${body ? `: ${body.slice(0, 200)}` : ''}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}
