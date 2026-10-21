import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Building2, CalendarClock } from 'lucide-react'
import type { RetirementSummary } from '../../lib/finance'
import {
  formatDateJa,
  formatPercent,
  formatSignedPercent,
  formatYen,
} from '../../lib/format'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardKicker,
  CardTitle,
} from '../ui/card'
import { EmptyState } from '../ui/empty-state'

const ALLOCATION_COLORS = ['#4F6B8A', '#5B9C82', '#C1913F', '#8A9C8D', '#AEB6AD']

export function PensionCard({
  summary,
  className,
}: {
  summary: RetirementSummary
  className?: string
}) {
  const hasData =
    summary.balance > 0 || summary.totalContributed > 0 || summary.monthlyTotal > 0

  return (
    <Card className={className}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Defined contribution</CardKicker>
          <CardTitle className="mt-1.5">確定拠出年金（JIS&amp;T）</CardTitle>
          <CardDescription>
            会社型DCの評価額と拠出額です。
          </CardDescription>
        </div>
        <Link
          to="/settings"
          hash="retirement"
          className="inline-flex items-center gap-1 text-[0.64rem] font-bold text-brand hover:text-brand-ink"
        >
          設定
          <ArrowUpRight className="size-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="pt-2">
        {!hasData ? (
          <EmptyState
            icon={Building2}
            title="JIS&Tの評価額が未設定です"
            description="評価額・累計拠出額・配分を設定すると、純資産とポートフォリオに反映されます。"
            action={
              <Link
                to="/settings"
                hash="retirement"
                className="inline-flex h-8 items-center justify-center rounded-full border border-line bg-surface px-3.5 text-[0.66rem] font-semibold text-ink transition hover:border-brand/30"
              >
                設定を開く
              </Link>
            }
          />
        ) : (
          <>
            <p className="text-[0.54rem] font-medium text-muted">評価額</p>
            <p className="mt-1 font-display text-[1.7rem] font-semibold leading-none text-ink tabular">
              {formatYen(summary.balance)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.58rem]">
              <span className="text-muted">累計拠出比</span>
              <span
                className={
                  summary.gain < 0
                    ? 'font-bold text-danger tabular'
                    : 'font-bold text-positive tabular'
                }
              >
                {summary.totalContributed > 0
                  ? `${formatYen(summary.gain, { sign: true })}${
                      summary.gainRatio == null
                        ? ''
                        : `（${formatSignedPercent(summary.gainRatio)}）`
                    }`
                  : '—'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line/80 bg-line/70">
              <div className="bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.5rem] text-muted">累計拠出額</p>
                <p className="mt-1 text-[0.7rem] font-bold text-ink tabular">
                  {formatYen(summary.totalContributed)}
                </p>
              </div>
              <div className="bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.5rem] text-muted">月額拠出</p>
                <p className="mt-1 text-[0.7rem] font-bold text-ink tabular">
                  {formatYen(summary.monthlyTotal)}
                </p>
                <p className="mt-0.5 text-[0.48rem] text-muted">
                  本人 {formatYen(summary.monthlyContribution)} / 会社{' '}
                  {formatYen(summary.employerContribution)}
                </p>
              </div>
            </div>

            {summary.allocations.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                {summary.allocations.slice(0, 5).map((allocation, index) => (
                  <div key={allocation.id}>
                    <div className="flex items-center justify-between gap-2 text-[0.54rem]">
                      <span className="truncate text-muted">
                        {allocation.label}
                      </span>
                      <span className="shrink-0 font-semibold text-ink tabular">
                        {formatPercent(allocation.ratio / 100, 1)}
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-line/60">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, allocation.ratio))}%`,
                          backgroundColor:
                            ALLOCATION_COLORS[
                              index % ALLOCATION_COLORS.length
                            ],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-line/70 bg-canvas/30 px-3 py-2 text-[0.56rem] text-muted">
                配分は未設定です。設定から商品ごとの比率を登録できます。
              </p>
            )}

            <p className="mt-3 flex items-center gap-1.5 text-[0.54rem] text-muted">
              <CalendarClock className="size-3" />
              基準日 {summary.valuedAt ? formatDateJa(summary.valuedAt) : '未設定'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
