import { formatYen } from '../../lib/format'

type TooltipPayloadItem = {
  name?: string | number
  value?: string | number | ReadonlyArray<string | number>
  color?: string
  dataKey?: unknown
  payload?: { fill?: string } & Record<string, unknown>
}

type TooltipRenderProps = {
  active?: boolean
  payload?: ReadonlyArray<TooltipPayloadItem>
  label?: string | number
}

export function MoneyTooltip({ active, payload, label }: TooltipRenderProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-[10.5rem] rounded-xl border border-line bg-surface/95 px-3 py-2.5 shadow-lift backdrop-blur">
      {label != null ? (
        <p className="mb-1.5 text-[0.6rem] font-bold tracking-[0.12em] text-muted">
          {label}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={String(entry.dataKey)}
            className="flex items-center justify-between gap-3 text-[0.68rem]"
          >
            <span className="flex items-center gap-1.5 text-muted">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold tabular text-ink">
              {formatYen(Number(entry.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PortfolioTooltip({ active, payload }: TooltipRenderProps) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-xl border border-line bg-surface/95 px-3 py-2.5 shadow-lift backdrop-blur">
      <p className="flex items-center gap-1.5 text-[0.66rem] text-muted">
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: entry.payload?.fill ?? entry.color }}
        />
        {entry.name}
      </p>
      <p className="mt-1 text-sm font-bold tabular text-ink">
        {formatYen(Number(entry.value))}
      </p>
    </div>
  )
}
