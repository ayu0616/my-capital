import { Link } from '@tanstack/react-router'
import { ArrowUpRight, CalendarClock, Gift } from 'lucide-react'
import type { StockGoalSummary } from '../../lib/finance'
import {
  formatDateJa,
  formatPercent,
  formatShares,
} from '../../lib/format'
import { Badge } from '../ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardKicker,
  CardTitle,
} from '../ui/card'

export function StockGoalsCard({
  summaries,
  className,
}: {
  summaries: StockGoalSummary[]
  className?: string
}) {
  const visible = summaries.slice(0, 3)

  return (
    <Card className={className}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Shareholder benefits</CardKicker>
          <CardTitle className="mt-1.5">優待株の進捗</CardTitle>
          <CardDescription>
            目標株数と期限から見た、現在の購入ペースです。
          </CardDescription>
        </div>
        <Link
          to="/stock-goals"
          className="inline-flex items-center gap-1 text-[0.64rem] font-bold text-brand hover:text-brand-ink"
        >
          すべて見る
          <ArrowUpRight className="size-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid gap-2 sm:grid-cols-2">
          {visible.map((summary) => (
            <div
              key={summary.id}
              className="rounded-xl border border-line/80 bg-canvas/30 px-3.5 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[0.7rem] font-bold text-ink">
                    {summary.name}
                  </p>
                  <p className="mt-0.5 text-[0.52rem] text-muted">
                    {summary.code ? `${summary.code} · ` : ''}
                    {summary.account}
                  </p>
                </div>
                {summary.isAchieved ? (
                  <Badge variant="success" className="text-[0.5rem]">
                    達成
                  </Badge>
                ) : summary.isOnTrack === false ? (
                  <Badge variant="warning" className="text-[0.5rem]">
                    ペース不足
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[0.5rem]">
                    {summary.daysRemaining < 0
                      ? '期限切れ'
                      : `あと${summary.daysRemaining}日`}
                  </Badge>
                )}
              </div>

              <div className="mt-2.5 flex items-baseline justify-between gap-2">
                <p className="text-[0.82rem] font-bold text-ink tabular">
                  {formatShares(summary.currentShares)}
                  <span className="text-[0.58rem] font-medium text-muted">
                    {' '}
                    / {formatShares(summary.targetShares)}株
                  </span>
                </p>
                <p className="text-[0.58rem] font-semibold text-brand tabular">
                  {formatPercent(summary.progress, 1)}
                </p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/70">
                <div
                  className={
                    summary.isAchieved
                      ? 'h-full rounded-full bg-gold'
                      : 'h-full rounded-full bg-brand'
                  }
                  style={{ width: `${Math.min(100, summary.progress * 100)}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 text-[0.54rem] text-muted">
                <span className="flex items-center gap-1">
                  <CalendarClock className="size-2.5" />
                  {formatDateJa(summary.targetDate)}
                </span>
                <span>
                  {summary.requiredSharesPerMonth == null
                    ? '—'
                    : `月${summary.requiredSharesPerMonth.toFixed(1)}株`}
                </span>
              </div>
            </div>
          ))}
        </div>

        {summaries.length > visible.length ? (
          <p className="mt-2.5 flex items-center gap-1.5 text-[0.56rem] text-muted">
            <Gift className="size-3" />
            ほか{summaries.length - visible.length}件の目標があります。
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
