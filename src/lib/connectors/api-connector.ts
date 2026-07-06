import { fetchEndpoint } from './http'
import { normalizeEndpoint } from './normalize'
import type { ApiConnectorConfig, NormalizedValue } from './config'

export type ConnectorResult = {
  values: NormalizedValue[]
  errors: string[]
}

/**
 * Generic API connector: fetch each configured endpoint and normalize its
 * response into metric values. Network happens here; the mapping logic is the
 * pure normalizeEndpoint(). A failed endpoint records an error but does not
 * abort the others.
 */
export async function runApiConnector(
  config: ApiConnectorConfig
): Promise<ConnectorResult> {
  const result: ConnectorResult = { values: [], errors: [] }

  for (const endpoint of config.endpoints) {
    try {
      const response = await fetchEndpoint(config.baseUrl, config.auth, endpoint)
      const norm = normalizeEndpoint(response, endpoint)
      result.values.push(...norm.values)
      result.errors.push(...norm.errors.map((e) => `${endpoint.path}: ${e}`))
    } catch (err) {
      result.errors.push(
        `${endpoint.path}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  return result
}
