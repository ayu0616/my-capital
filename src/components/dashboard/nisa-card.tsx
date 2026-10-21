import { CalendarClock, Target } from 'lucide-react'
import type { NisaPlan } from '../../lib/finance'
import {
  formatCompactYen,
  formatMonthEta,
  formatPercent,
  formatYen,
} from '../../lib/format'
import { cn } from '../../lib/utils'
import { ProgressRing } from '../charts/ring'
import { Badge } from '../ui/form'
import { Card, CardContent, CardHeader, CardKicker, CardTitle } from '../ui/card'

export function NisaCard({
  plan,
  className,
}: {
  plan: NisaPlan
  className?: string
}) {
  const percent = formatPercent(plan.progress)

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div>
          <CardKicker>New NISA · Lifetime</CardKicker>
          <CardTitle className="mt-1.5">NISAの積立状況</CardTitle>
        </div>
        <Badge variant={plan.isComplete ? 'success' : 'brand'}>{percent}</Badge>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="flex items-center gap-4 sm:gap-6">
          <ProgressRing value={plan.progress} size={118} stroke={9}>
            <span className="font-display text-[1.55rem] font-semibold leading-none text-ink">
              {Math.round(plan.progress * 100)}
              <span className="ml-0.5 text-[0.8rem] text-muted">%</span>
            </span>
            <span className="mt-1 text-[0.48rem] font-bold tracking-[0.18em] text-muted">
              PROGRESS
            </span>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <p className="text-[0.64rem] font-medium text-muted">累計投資元本</p>
            <p className="mt-1 truncate font-display text-[1.55rem] font-semibold leading-tight text-ink tabular sm:text-[1.75rem]">
              {formatYen(plan.principal)}
            </p>
            <p className="mt-1.5 text-[0.68rem] text-muted">
              残り{' '}
              <span className="font-semibold text-ink">
                {formatCompactYen(plan.remaining)}
              </span>
              <span className="text-muted/70"> / {formatCompactYen(plan.targetAmount)}</span>
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line/70 pt-4">
          <div>
            <p className="flex items-center gap-1 text-[0.58rem] text-muted">
              <Target className="size-3" />
              目標
            </p>
            <p className="mt-1 text-[0.78rem] font-semibold text-ink">
              {plan.targetAge}歳 · {formatMonthEta(plan.targetDate)}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[0.58rem] text-muted">
              <CalendarClock className="size-3" />
              残り期間
            </p>
            <p className="mt-1 text-[0.78rem] font-semibold text-ink tabular">
              あと {Math.ceil(plan.monthsLeft)}ヶ月
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-brand/10 bg-brand-soft/70 px-3.5 py-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[0.58rem] text-brand-ink/65">目標達成に必要な月額</p>
                <p className="mt-0.5 font-display text-[1.15rem] font-semibold text-brand-ink tabular">
                  {plan.isComplete ? '達成済み' : formatYen(plan.requiredMonthly)}
                </p>
              </div>
              <p className="pb-1 text-right text-[0.56rem] leading-relaxed text-brand-ink/55">
                現在 {plan.age}歳
                <br />
                目標 {plan.targetAge}歳
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#17573d,#6aa98a)] transition-[width] duration-1000"
              style={{ width: `${plan.progress * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[0.6rem] leading-relaxed text-muted">
            {plan.isComplete
              ? `設定した目標額（${formatCompactYen(plan.targetAmount)}）に到達しました。`
              : '目標額と目標年齢から、必要な月額を計算しています。'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
