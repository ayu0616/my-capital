import {
  CalendarClock,
  Gift,
  Pencil,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import type { StockGoalSummary } from '../../lib/finance'
import {
  formatDateJa,
  formatPercent,
  formatShares,
  formatSignedPercent,
  formatYen,
} from '../../lib/format'
import { Badge } from '../ui/form'
import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardKicker,
  CardTitle,
} from '../ui/card'

function deadlineLabel(summary: StockGoalSummary): string {
  if (summary.isAchieved) return '達成済み'
  if (summary.daysRemaining < 0) return `${Math.abs(summary.daysRemaining)}日超過`
  if (summary.daysRemaining === 0) return '今日まで'
  return `あと${summary.daysRemaining}日`
}

function statusBadge(summary: StockGoalSummary) {
  if (summary.isAchieved) {
    return <Badge variant="success">達成</Badge>
  }
  if (summary.isOverdue) {
    return <Badge variant="danger">期限切れ</Badge>
  }
  if (summary.isOnTrack === true) {
    return <Badge variant="success">順調</Badge>
  }
  if (summary.isOnTrack === false) {
    return <Badge variant="warning">ペース不足</Badge>
  }
  return <Badge variant="outline">期限から逆算</Badge>
}

export function StockGoalCard({
  summary,
  onEdit,
  onDelete,
}: {
  summary: StockGoalSummary
  onEdit: () => void
  onDelete: () => void
}) {
  const progressPercent = Math.min(100, summary.progress * 100)
  const requiredPace =
    summary.requiredSharesPerMonth == null
      ? null
      : summary.requiredSharesPerMonth

  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-start gap-3">
        <div className="min-w-0">
          <CardKicker className="flex flex-wrap items-center gap-2">
            <span>Shareholder benefit</span>
            {summary.code ? (
              <span className="rounded-full border border-line bg-canvas/70 px-1.5 py-px text-[0.5rem] tracking-normal text-muted">
                {summary.code}
              </span>
            ) : null}
          </CardKicker>
          <CardTitle className="mt-1.5 truncate">{summary.name}</CardTitle>
          <CardDescription className="mt-1">
            {summary.account} · {summary.minimumPurchaseUnit}株単位
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {statusBadge(summary)}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${summary.name}の目標を編集`}
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${summary.name}の目標を削除`}
            className="text-muted hover:text-danger"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-1">
        <div className="rounded-2xl border border-brand/10 bg-brand-soft/45 px-4 py-3.5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.54rem] font-medium text-muted">進捗</p>
              <p className="mt-1 font-display text-[1.5rem] font-semibold leading-none text-ink tabular">
                {formatShares(summary.currentShares)}
                <span className="ml-1 text-[0.78rem] font-medium text-muted">
                  / {formatShares(summary.targetShares)}株
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.54rem] text-muted">あと</p>
              <p className="mt-1 text-[0.9rem] font-bold text-ink tabular">
                {formatShares(summary.remainingShares)}株
              </p>
            </div>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
            aria-label={`${summary.name}の目標株数への進捗`}
          >
            <div
              className={
                summary.isAchieved
                  ? 'h-full rounded-full bg-gold'
                  : 'h-full rounded-full bg-brand'
              }
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[0.56rem] text-muted">
            <span>{formatPercent(summary.progress, 1)}</span>
            <span>{deadlineLabel(summary)}</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line/80 bg-line/70">
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[0.5rem] text-muted">
              <Target className="size-2.5" />
              目標期限
            </p>
            <p className="mt-1 text-[0.68rem] font-bold text-ink">
              {formatDateJa(summary.targetDate)}
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[0.5rem] text-muted">
              <CalendarClock className="size-2.5" />
              月あたり必要
            </p>
            <p className="mt-1 text-[0.68rem] font-bold text-ink tabular">
              {requiredPace == null
                ? '期限切れ'
                : `${requiredPace.toFixed(1)}株`}
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.5rem] text-muted">必要月額の目安</p>
            <p className="mt-1 text-[0.68rem] font-bold text-ink tabular">
              {summary.requiredBudgetPerMonth == null
                ? '—'
                : formatYen(summary.requiredBudgetPerMonth)}
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.5rem] text-muted">購入回数</p>
            <p className="mt-1 text-[0.68rem] font-bold text-ink tabular">
              {summary.purchaseCountRemaining == null
                ? '—'
                : `あと${summary.purchaseCountRemaining}回`}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/70 px-3 py-2.5">
          <div>
            <p className="text-[0.5rem] text-muted">評価額</p>
            <p className="mt-0.5 text-[0.72rem] font-bold text-ink tabular">
              {formatYen(summary.value)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.5rem] text-muted">評価損益</p>
            <p
              className={
                summary.unrealizedGain != null && summary.unrealizedGain < 0
                  ? 'mt-0.5 text-[0.72rem] font-bold text-danger tabular'
                  : 'mt-0.5 text-[0.72rem] font-bold text-positive tabular'
              }
            >
              {summary.unrealizedGain == null
                ? '—'
                : formatYen(summary.unrealizedGain, { sign: true })}
            </p>
            {summary.unrealizedGainRatio != null ? (
              <p className="text-[0.5rem] text-muted tabular">
                {formatSignedPercent(summary.unrealizedGainRatio)}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-[0.5rem] text-muted">平均取得単価</p>
            <p className="mt-0.5 text-[0.72rem] font-bold text-ink tabular">
              {summary.averageAcquisitionPrice > 0
                ? formatYen(summary.averageAcquisitionPrice)
                : '—'}
            </p>
          </div>
        </div>

        {summary.monthlyBudget > 0 ? (
          <div className="mt-3 rounded-xl border border-gold/20 bg-gold/8 px-3 py-2.5 text-[0.58rem] leading-relaxed text-gold-strong">
            <p className="flex items-center gap-1.5 font-semibold">
              <TrendingUp className="size-3" />
              月{formatYen(summary.monthlyBudget)}ペース
            </p>
            <p className="mt-1">
              {summary.isAchieved
                ? '目標株数に到達しています。'
                : summary.projectedMonthLabel
                  ? `${summary.projectedMonthLabel}に到達する計算です。`
                  : '現在株価を入力すると到達月を計算できます。'}
              {!summary.isAchieved && summary.isOnTrack === false
                ? ' 期限には届かないため、前倒しで購入するか予算を見直します。'
                : ''}
              {!summary.isAchieved && summary.isOnTrack === true
                ? ' 期限に間に合うペースです。'
                : ''}
            </p>
          </div>
        ) : null}

        {summary.benefitNote ? (
          <div className="mt-3 flex gap-2 rounded-xl border border-line/70 bg-canvas/30 px-3 py-2.5">
            <Gift className="mt-0.5 size-3.5 shrink-0 text-gold-strong" />
            <p className="text-[0.58rem] leading-relaxed text-muted">
              {summary.benefitNote}
            </p>
          </div>
        ) : null}

        {summary.notes ? (
          <p className="mt-2 text-[0.56rem] leading-relaxed text-muted/80">
            {summary.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
