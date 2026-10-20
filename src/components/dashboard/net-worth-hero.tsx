import { ArrowDownRight, ArrowUpRight, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { NetWorthTrend, Portfolio } from '../../lib/finance'
import {
  formatPercent,
  formatSignedPercent,
  formatYearMonth,
  formatYen,
} from '../../lib/format'
import { cn } from '../../lib/utils'
import { Sparkline } from '../charts/ring'
import { Card } from '../ui/card'

export function NetWorthHero({
  portfolio,
  trend,
  series,
  yearMonth,
  className,
}: {
  portfolio: Portfolio
  trend: NetWorthTrend
  series: number[]
  yearMonth: string | null
  className?: string
}) {
  const positive = (trend.delta ?? 0) >= 0
  const cash = portfolio.slices.find((slice) => slice.key === 'cash')
  const cashRatio = portfolio.total > 0 ? (cash?.amount ?? 0) / portfolio.total : 0
  const overLimit = portfolio.isFujitsuOverLimit

  return (
    <Card
      className={cn(
        'hero-card flex flex-col rounded-[1.6rem] px-5 py-5 text-white/90 sm:px-7 sm:py-6',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.56rem] font-bold uppercase tracking-[0.26em] text-[#d7b87d]">
            True net worth
          </p>
          <p className="mt-1.5 text-[0.7rem] text-white/50">
            真の純資産 — 金融資産 ＋ 機材の現在価値
          </p>
        </div>
        {yearMonth ? (
          <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-[0.6rem] font-semibold text-white/70 backdrop-blur">
            {formatYearMonth(yearMonth)}
          </span>
        ) : null}
      </div>

      <div className="mt-6">
        <p className="flex items-baseline gap-2 font-display text-[clamp(2.15rem,6.4vw,3.35rem)] leading-none tracking-[-0.02em] text-white">
          <span className="text-[0.55em] font-normal text-[#d7b87d]">¥</span>
          <span className="tabular">
            {new Intl.NumberFormat('ja-JP').format(Math.round(portfolio.total))}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.68rem]">
          {trend.delta == null ? (
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-white/55">
              比較できる先月データがありません
            </span>
          ) : (
            <>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold tabular',
                  positive
                    ? 'border-[#8ed3ad]/25 bg-[#8ed3ad]/12 text-[#a9e4c1]'
                    : 'border-[#e8a29a]/25 bg-[#e8a29a]/12 text-[#f0b6ae]',
                )}
              >
                {positive ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {formatYen(trend.delta, { sign: true })}
              </span>
              <span className="text-white/45">
                先月比 {formatSignedPercent(trend.deltaRatio ?? 0)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 -mb-1 opacity-90">
        <Sparkline data={series} height={58} color="#d7b87d" className="h-[58px]" />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2.5 pt-4">
        <div className="glass-dark rounded-xl px-3.5 py-3">
          <p className="text-[0.58rem] font-medium tracking-wide text-white/45">
            金融資産
          </p>
          <p className="mt-1 text-[0.94rem] font-semibold tabular text-white/95">
            {formatYen(portfolio.financialTotal)}
          </p>
        </div>
        <div className="glass-dark rounded-xl px-3.5 py-3">
          <p className="text-[0.58rem] font-medium tracking-wide text-white/45">
            機材の現在価値
          </p>
          <p className="mt-1 text-[0.94rem] font-semibold tabular text-white/95">
            {formatYen(portfolio.gearValue)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.58rem] text-white/40">
        <span>現金比率 {formatPercent(cashRatio)}</span>
        <span
          className={cn(
            'inline-flex items-center gap-1',
            overLimit ? 'text-[#f0b6ae]' : 'text-[#a9e4c1]/80',
          )}
        >
          {overLimit ? <ShieldAlert className="size-3" /> : <ShieldCheck className="size-3" />}
          富士通比率 {formatPercent(portfolio.fujitsuRatio)}（上限{' '}
          {formatPercent(portfolio.threshold, 0)}）
        </span>
        <Link
          to="/assets"
          className="text-[0.58rem] font-semibold text-[#d7b87d] underline decoration-[#d7b87d]/30 underline-offset-2 transition hover:text-[#efd6a7]"
        >
          記録を見る
        </Link>
      </div>
    </Card>
  )
}
