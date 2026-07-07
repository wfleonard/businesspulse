import { formatMoney, type Period } from '@/lib/reports/period'

export type Line = {
  label: string
  values: number[]
  bold?: boolean
  heading?: boolean
}

/** Generic period-columned financial table (P&L, cash, payroll). */
export function LedgerTable({ periods, lines }: { periods: Period[]; lines: Line[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border text-text-secondary">
            <th className="py-2 text-left font-medium">Account</th>
            {periods.map((p) => (
              <th key={p.key} className="py-2 text-right font-medium">
                {p.label}
              </th>
            ))}
            {periods.length > 1 && <th className="py-2 text-right font-medium">Total</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) =>
            line.heading ? (
              <tr key={i}>
                <td
                  colSpan={periods.length + (periods.length > 1 ? 2 : 1)}
                  className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary"
                >
                  {line.label}
                </td>
              </tr>
            ) : (
              <tr key={i} className={line.bold ? 'border-t border-border' : ''}>
                <td className={`py-1.5 ${line.bold ? 'font-semibold text-dark' : 'text-dark'}`}>
                  {line.label}
                </td>
                {line.values.map((v, j) => (
                  <td
                    key={j}
                    className={`py-1.5 text-right tabular-nums ${line.bold ? 'font-semibold text-dark' : 'text-text-secondary'}`}
                  >
                    {formatMoney(v)}
                  </td>
                ))}
                {periods.length > 1 && (
                  <td className={`py-1.5 text-right tabular-nums ${line.bold ? 'font-semibold text-dark' : 'text-dark'}`}>
                    {formatMoney(line.values.reduce((a, b) => a + b, 0))}
                  </td>
                )}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}
