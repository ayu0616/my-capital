import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import type { AssetSnapshot } from '../../db/schema'
import { snapshotTotal } from '../../lib/finance'
import { formatCompactYen, formatSignedPercent, formatYearMonth } from '../../lib/format'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardKicker, CardTitle } from '../ui/card'

export function RecentSnapshots({
  snapshots,
  className,
}: {
  snapshots: AssetSnapshot[]
  className?: string
}) {
  const chronological = [...snapshots].sort((a, b) =>
    a.yearMonth.localeCompare(b.yearMonth),
  )
  const rows = chronological
    .slice(-4)
    .reverse()
    .map((snapshot, index, reversed) => {
      const previous = reversed[index + 1]
      const total = snapshotTotal(snapshot)
      const previousTotal = previous ? snapshotTotal(previous) : null
      const delta = previousTotal == null ? null : total - previousTotal
      const ratio =
        previousTotal && previousTotal > 0 ? (total - previousTotal) / previousTotal : null
      return { snapshot, total, delta, ratio }
    })

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Recent records</CardKicker>
          <CardTitle className="mt-1.5">最近の記録</CardTitle>
        </div>
        <Link
          to="/assets"
          className="flex items-center gap-1 text-[0.65rem] font-semibold text-brand hover:text-brand-strong"
        >
          <Plus className="size-3.5" />
          記録する
        </Link>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <p className="text-xs font-semibold text-ink">まだ記録がありません</p>
            <p className="mt-1 text-[0.62rem] text-muted">
              最初の1ヶ月を記録して、推移を始めましょう。
            </p>
            <Link
              to="/assets"
              className="mt-4 inline-flex h-9 items-center rounded-full bg-brand px-4 text-[0.72rem] font-semibold text-brand-contrast"
            >
              スナップショットを追加
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {rows.map(({ snapshot, total, delta, ratio }) => (
              <li key={snapshot.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.65rem] border border-line/80 bg-canvas/50 text-[0.56rem] font-bold text-ink-soft tabular">
                  {Number(snapshot.yearMonth.slice(5))}月
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.7rem] font-semibold text-ink">
                    {formatYearMonth(snapshot.yearMonth)}
                  </p>
                  <p className="mt-0.5 truncate text-[0.56rem] text-muted">
                    {delta == null
                      ? '基準月'
                      : `前月比 ${formatSignedPercent(ratio ?? 0)}`}
                    {snapshot.notes ? ` · ${snapshot.notes}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.7rem] font-bold text-ink tabular">
                    {formatCompactYen(total)}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-[0.54rem] tabular',
                      (delta ?? 0) >= 0 ? 'text-positive' : 'text-danger',
                    )}
                  >
                    {delta == null ? '—' : formatCompactYen(delta)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto border-t border-line/70 pt-3">
          <Link
            to="/assets"
            className="text-[0.6rem] font-semibold text-brand underline decoration-brand/25 underline-offset-2"
          >
            すべてのスナップショットを見る
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
