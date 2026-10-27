import { Link } from '@tanstack/react-router'
import { Landmark, Plus } from 'lucide-react'
import type { LoanSummary } from '../../lib/finance'
import { buildLoanTotals } from '../../lib/finance'
import { formatPercent, formatYen } from '../../lib/format'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardKicker, CardTitle } from '../ui/card'

export function LoansCard({
  summaries,
  className,
}: {
  summaries: LoanSummary[]
  className?: string
}) {
  const totals = buildLoanTotals(summaries)
  const active = summaries.filter((summary) => !summary.isPaidOff)
  const nearest = [...active]
    .filter((summary) => summary.projectedPayoffDate)
    .sort(
      (a, b) =>
        (a.projectedPayoffDate?.getTime() ?? 0) -
        (b.projectedPayoffDate?.getTime() ?? 0),
    )[0]

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Liabilities</CardKicker>
          <CardTitle className="mt-1.5">奨学金・ローン</CardTitle>
        </div>
        <Link
          to="/loans"
          className="flex items-center gap-1 text-[0.65rem] font-semibold text-brand hover:text-brand-strong"
        >
          <Plus className="size-3.5" />
          返済を記録
        </Link>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-1">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.5rem] text-muted">残高の合計</p>
            <p className="mt-1 text-[0.8rem] font-bold text-ink tabular">
              {formatYen(totals.balanceTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.5rem] text-muted">毎月の返済</p>
            <p className="mt-1 text-[0.8rem] font-bold text-ink tabular">
              {formatYen(totals.monthlyPaymentTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.5rem] text-muted">返済進捗</p>
            <p className="mt-1 text-[0.8rem] font-bold text-ink tabular">
              {formatPercent(totals.progress, 1)}
            </p>
          </div>
          <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.5rem] text-muted">返済中の記録</p>
            <p className="mt-1 text-[0.8rem] font-bold text-ink tabular">
              {totals.activeCount}件
            </p>
          </div>
        </div>

        {active.length > 0 ? (
          <ul className="mt-2 divide-y divide-line/60">
            {active.slice(0, 3).map((summary) => (
              <li
                key={summary.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Landmark className="size-3 shrink-0 text-gold-strong" />
                  <span className="min-w-0">
                    <span className="block truncate text-[0.66rem] font-semibold text-ink">
                      {summary.name}
                    </span>
                    <span className="mt-0.5 block text-[0.52rem] text-muted">
                      {summary.kindLabel}
                      {summary.lender ? ` · ${summary.lender}` : ''}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[0.66rem] font-bold text-ink tabular">
                    {formatYen(summary.currentBalance)}
                  </span>
                  <span className="mt-0.5 block text-[0.52rem] text-muted">
                    {summary.projectedPayoffLabel
                      ? `${summary.projectedPayoffLabel} 完済予定`
                      : '完済時期は未計算'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-line/70 bg-canvas/30 px-3 py-2.5 text-[0.58rem] text-muted">
            返済中の記録はありません。
          </p>
        )}

        <p className="mt-auto border-t border-line/70 pt-3 text-[0.56rem] leading-relaxed text-muted">
          残高は純資産から差し引きます。
          {nearest?.projectedPayoffLabel
            ? `直近の完済予定は${nearest.projectedPayoffLabel}です。`
            : ''}
        </p>
      </CardContent>
    </Card>
  )
}
