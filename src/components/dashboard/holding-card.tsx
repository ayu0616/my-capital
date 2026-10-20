import { Link } from '@tanstack/react-router'
import { ArrowUpRight, PartyPopper, Sparkles } from 'lucide-react'
import type { HoldingPlan } from '../../lib/finance'
import {
  formatNumber,
  formatPercent,
  formatShares,
  formatYen,
} from '../../lib/format'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardKicker, CardTitle } from '../ui/card'
import { Badge } from '../ui/form'
import { Progress } from '../ui/progress'

export function HoldingCard({
  plan,
  className,
}: {
  plan: HoldingPlan
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Employee holding</CardKicker>
          <CardTitle className="mt-1.5">富士通・100株への道</CardTitle>
        </div>
        <Badge variant={plan.isComplete ? 'success' : 'gold'}>
          {plan.isComplete
            ? '単元達成'
            : plan.monthsToTarget == null
              ? '株価を入力'
              : `あと ${formatNumber(plan.monthsToTarget, 1)}ヶ月`}
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {plan.isComplete ? (
          <div className="mb-5 rounded-2xl border border-gold/25 bg-[linear-gradient(135deg,#f7edd9,#f1e1c2)] p-4 text-ink dark:bg-[linear-gradient(135deg,#2a2114,#241b0f)] dark:text-ink">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold-strong">
                <PartyPopper className="size-4" />
              </span>
              <div>
                <p className="text-[0.8rem] font-bold">🎉 100株達成 — リバランスの合図</p>
                <p className="mt-1.5 text-[0.68rem] leading-relaxed text-ink-soft">
                  SMBC日興証券から引き出して売却し、楽天証券のNISAでオルカン／ロマン枠を買い直しましょう。単元化の目的は達成です。
                </p>
                <Link
                  to="/assets"
                  className="mt-2.5 inline-flex items-center gap-1 text-[0.66rem] font-bold text-gold-strong underline decoration-gold/30 underline-offset-2"
                >
                  リバランス後の資産を記録
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.6rem] font-medium text-muted">保有株数</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-[clamp(2.1rem,4.5vw,2.8rem)] font-semibold leading-none text-ink tabular">
                {formatNumber(plan.currentShares, 1)}
              </span>
              <span className="text-[0.8rem] font-medium text-muted">
                / {formatShares(plan.targetShares)}株
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.6rem] font-medium text-muted">現在の評価額</p>
            <p className="mt-1 text-[0.95rem] font-bold text-ink tabular">
              {formatYen(plan.value)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Progress
              value={plan.progress}
              className="h-2.5 bg-ink/[0.07]"
              barClassName="bg-[linear-gradient(90deg,#17573d,#5b9c82)]"
              label="持株会の単元進捗"
            />
            {[0.25, 0.5, 0.75].map((tick) => (
              <span
                key={tick}
                aria-hidden="true"
                className="absolute top-0 h-2.5 w-px bg-surface/70"
                style={{ left: `${tick * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[0.55rem] text-muted">
            <span>0</span>
            <span>50</span>
            <span>100株</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-line/70 rounded-xl border border-line/80 bg-canvas/35 py-3">
          <div className="px-3">
            <p className="text-[0.52rem] leading-tight text-muted">毎月の購入</p>
            <p className="mt-1 text-[0.76rem] font-bold text-ink tabular">
              {formatNumber(plan.monthlyShares, 1)}株
            </p>
          </div>
          <div className="px-3">
            <p className="text-[0.52rem] leading-tight text-muted">月の購入額</p>
            <p className="mt-1 text-[0.7rem] font-bold text-ink tabular">
              {formatYen(plan.monthlyPurchaseAmount)}
            </p>
          </div>
          <div className="px-3">
            <p className="text-[0.52rem] leading-tight text-muted">到達予定</p>
            <p className="mt-1 text-[0.7rem] font-bold text-ink">
              {plan.etaLabel ?? '—'}
            </p>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-[0.58rem] text-muted">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3 text-gold" />
            奨励金 {formatPercent(plan.incentiveRate, 0)} 込み・株価 {formatYen(plan.price)}
          </span>
          <Link
            to="/settings"
            className="font-semibold text-brand underline decoration-brand/25 underline-offset-2 hover:text-brand-strong"
          >
            株価と拠出額を更新
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
