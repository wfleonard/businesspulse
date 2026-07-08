'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  createSourceAction,
  previewSourceAction,
  type SourceFormState,
  type PreviewState,
} from '@/app/dashboard/sources/actions'

const initial: SourceFormState = { ok: false }
const initialPreview: PreviewState = { ok: false }

// A neutral, production-safe example template showing per-row + aggregate
// (count/sum) mappings and a row filter. Replace with your real API.
const EXAMPLE = JSON.stringify(
  {
    baseUrl: 'https://api.example.com',
    auth: { type: 'bearer', token: 'YOUR_TOKEN' },
    endpoints: [
      {
        path: '/v1/orders',
        query: { limit: '1000' },
        filter: [{ path: 'status', equals: 'completed' }],
        mappings: [
          {
            metricKey: 'orders_count',
            aggregate: 'count',
            periodStartPath: 'created_at',
            periodGranularity: 'month',
          },
          {
            metricKey: 'order_revenue',
            aggregate: 'sum',
            valuePath: 'total',
            periodStartPath: 'created_at',
            periodGranularity: 'month',
          },
        ],
      },
    ],
  },
  null,
  2
)

const inputCls =
  'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export function AddSourceForm() {
  const [config, setConfig] = useState(EXAMPLE)
  const [state, action, pending] = useActionState(createSourceAction, initial)
  const [preview, previewAction, previewing] = useActionState(previewSourceAction, initialPreview)

  return (
    <>
      {/* Separate form so the Preview button submits just the config (no mappings
          required yet) without triggering create. Shares the config via a hidden
          field mirroring the controlled textarea. */}
      <form action={previewAction} id="preview-form" className="hidden">
        <input type="hidden" name="config" value={config} />
      </form>

      <form action={action} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-dark">Source name</span>
          <input name="name" placeholder="Marketing API" required className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-dark">Connector config (JSON)</span>
          <textarea
            name="config"
            rows={16}
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            spellCheck={false}
            className={`${inputCls} font-mono text-xs`}
          />
        </label>
        <p className="text-xs text-text-secondary">
          <code>auth.type</code>: <code>none</code> · <code>apiKey</code> (header, key) ·{' '}
          <code>bearer</code> (token) · <code>basic</code> (username, password). A mapping either
          reads one value per row (<code>valuePath</code>) or aggregates rows into periods
          (<code>aggregate</code>: <code>count</code>/<code>sum</code> +{' '}
          <code>periodGranularity</code>). Optional <code>filter</code> keeps only matching rows.
          Add multiple <code>endpoints</code> for one API. Secrets are encrypted at rest.
        </p>
        <p className="text-xs text-text-secondary">
          Not sure of the field names? Click <strong>Preview response</strong> to fetch the first
          endpoint and see its structure — then map the paths it shows.
        </p>

        {state.errors && state.errors.length > 0 && (
          <ul className="list-inside list-disc text-sm text-danger">
            {state.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" form="preview-form" variant="secondary" disabled={previewing}>
            {previewing ? 'Fetching…' : 'Preview response'}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Create source'}
          </Button>
          {state.ok && state.message && (
            <span className="text-sm text-success">{state.message}</span>
          )}
        </div>
      </form>

      <PreviewResult preview={preview} />
    </>
  )
}

function PreviewResult({ preview }: { preview: PreviewState }) {
  if (preview.errors && preview.errors.length > 0) {
    return (
      <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
        <p className="mb-1 font-medium text-danger">Preview failed</p>
        <ul className="list-inside list-disc text-danger">
          {preview.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    )
  }
  if (!preview.ok || !preview.shape) return null

  const { shape, endpointPath } = preview
  return (
    <div className="mt-4 rounded-md border border-border bg-gray-50 p-3 text-sm">
      <p className="mb-2 font-medium text-dark">
        Response from <code>{endpointPath}</code>
      </p>

      {shape.fields.length > 0 ? (
        <>
          <p className="mb-2 text-xs text-text-secondary">
            {shape.rowCount} row(s). Fields on the first row — use these paths in your mappings
            (<code>valuePath</code>, <code>periodStartPath</code>, <code>dimensions</code>):
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="text-text-secondary">
                  <th className="border-b border-border py-1 pr-4 font-medium">Path</th>
                  <th className="border-b border-border py-1 pr-4 font-medium">Type</th>
                  <th className="border-b border-border py-1 font-medium">Sample</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {shape.fields.map((f) => (
                  <tr key={f.path}>
                    <td className="border-b border-border/60 py-1 pr-4 text-primary">{f.path}</td>
                    <td className="border-b border-border/60 py-1 pr-4 text-text-secondary">
                      {f.type}
                    </td>
                    <td className="border-b border-border/60 py-1 text-dark">{f.sample}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-xs text-text-secondary">
          No array of rows found at{' '}
          {/* help the user locate rowsPath */}
          the top level.
          {shape.rootKeys.length > 0 && (
            <>
              {' '}
              The response has these top-level keys — point <code>rowsPath</code> at the one holding
              your list:{' '}
              {shape.rootKeys.map((k, i) => (
                <span key={k}>
                  {i > 0 && ', '}
                  <code>{k}</code>
                </span>
              ))}
              .
            </>
          )}
        </p>
      )}
    </div>
  )
}
