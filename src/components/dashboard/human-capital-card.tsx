import { Link } from '@tanstack/react-router'
import { GraduationCap, TrendingUp } from 'lucide-react'
import type { HumanCapitalSummary } from '../../lib/finance'
import { formatPercent, formatYen } from '../../lib/format'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardKicker, CardTitle } from '../ui/card'

export function HumanCapitalCard({
  summary,
  className,
}: {
  summary: HumanCapitalSummary
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Human capital</CardKicker>
          <CardTitle className="mt-1.5">学びのリターン</CardTitle>
        </div>
        <span className="flex size-8 items-center justify-center rounded-xl border border-brand/10 bg-brand-soft text-brand">
          <GraduationCap className="size-4" />
        </span>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div>
          <p className="text-[0.58rem] font-medium text-muted">自己投資ROI（単純計算）</p>
          <p className="mt-1 font-display text-[1.9rem] font-semibold leading-none text-ink tabular">
            {summary.roi == null ? '—' : `+${formatPercent(summary.roi, 0)}`}
          </p>
          <p className="mt-1.5 text-[0.6rem] leading-relaxed text-muted">
            {summary.annualGain > 0
              ? `年収増 ${formatYen(summary.annualGain)} を投資コストで割った値`
              : '昇格・昇給を記録するとリターンが見えます'}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">投資累計</p>
            <p className="mt-1 text-[0.74rem] font-bold text-ink tabular">
              {formatYen(summary.totalCost)}
            </p>
          </div>
          <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">回収期間</p>
            <p className="mt-1 text-[0.74rem] font-bold text-ink tabular">
              {summary.paybackMonths == null
                ? '—'
                : `${summary.paybackMonths < 1 ? summary.paybackMonths.toFixed(1) : Math.ceil(summary.paybackMonths)}ヶ月`}
            </p>
          </div>
        </div>

        {summary.totalCost > 0 ? (
          <div className="mt-4">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
              {summary.byCategory
                .filter((category) => category.amount > 0)
                .map((category) => (
                  <span
                    key={category.key}
                    className="h-full"
                    style={{
                      width: `${category.ratio * 100}%`,
                      backgroundColor: category.color,
                    }}
                  />
                ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
              {summary.byCategory
                .filter((category) => category.amount > 0)
                .map((category) => (
                  <span
                    key={category.key}
                    className="flex items-center gap-1 text-[0.55rem] text-muted"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.label}
                  </span>
                ))}
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/70 pt-3.5">
          <span className="inline-flex items-center gap-1 text-[0.6rem] text-muted">
            <TrendingUp className="size-3 text-positive" />
            {summary.count}件の記録
          </span>
          <Link
            to="/self-investment"
            className="text-[0.62rem] font-semibold text-brand underline decoration-brand/25 underline-offset-2"
          >
            記録を追加
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
