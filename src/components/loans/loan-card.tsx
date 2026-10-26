import {
  CalendarClock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { LoanPayment } from '../../db/schema'
import type { LoanSummary } from '../../lib/finance'
import {
  formatDateJa,
  formatPercent,
  formatYen,
} from '../../lib/format'
import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardKicker,
  CardTitle,
} from '../ui/card'
import { Badge } from '../ui/form'

export function LoanCard({
  summary,
  payments,
  onEdit,
  onDelete,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
}: {
  summary: LoanSummary
  payments: LoanPayment[]
  onEdit: () => void
  onDelete: () => void
  onAddPayment: () => void
  onEditPayment: (payment: LoanPayment) => void
  onDeletePayment: (payment: LoanPayment) => void
}) {
  const progressPercent = Math.min(100, summary.progress * 100)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-start gap-3">
        <div className="min-w-0">
          <CardKicker className="flex flex-wrap items-center gap-2">
            <span>Scholarship &amp; loan</span>
            <Badge variant="outline" className="text-[0.5rem]">
              {summary.kindLabel}
            </Badge>
          </CardKicker>
          <CardTitle className="mt-1.5 truncate">{summary.name}</CardTitle>
          <CardDescription className="mt-1">
            {summary.lender || '借入先未設定'}
            {summary.borrowedAt
              ? ` · ${formatDateJa(summary.borrowedAt)} 借入`
              : ''}
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {summary.isPaidOff ? (
            <Badge variant="success">完済</Badge>
          ) : (
            <Badge variant="gold">{formatPercent(summary.progress, 1)}</Badge>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${summary.name}を編集`}
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${summary.name}を削除`}
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
              <p className="text-[0.54rem] font-medium text-muted">現在の残高</p>
              <p className="mt-1 font-display text-[1.5rem] font-semibold leading-none text-ink tabular">
                {formatYen(summary.currentBalance)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.54rem] text-muted">借入額</p>
              <p className="mt-1 text-[0.8rem] font-bold text-ink tabular">
                {formatYen(summary.principalAmount)}
              </p>
            </div>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
            aria-label={`${summary.name}の返済進捗`}
          >
            <div
              className={
                summary.isPaidOff
                  ? 'h-full rounded-full bg-gold'
                  : 'h-full rounded-full bg-brand'
              }
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[0.56rem] text-muted">
            <span>返済済み {formatYen(summary.repaidAmount)}</span>
            <span>
              {summary.isPaidOff
                ? '完済'
                : summary.projectedPayoffLabel
                  ? `${summary.projectedPayoffLabel} 完済予定`
                  : '完済時期は未計算'}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line/80 bg-line/70">
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.5rem] text-muted">月額返済</p>
            <p className="mt-1 text-[0.68rem] font-bold text-ink tabular">
              {summary.monthlyPayment > 0
                ? formatYen(summary.monthlyPayment)
                : '—'}
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.5rem] text-muted">残りの返済回数</p>
            <p className="mt-1 text-[0.68rem] font-bold text-ink tabular">
              {summary.remainingPayments == null
                ? '—'
                : summary.remainingPayments === 0
                  ? '完済'
                  : `${summary.remainingPayments}回`}
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.5rem] text-muted">金利（年率）</p>
            <p className="mt-1 text-[0.68rem] font-bold text-ink tabular">
              {summary.interestRate > 0
                ? `${formatPercent(summary.interestRate / 100, 2)}`
                : '—'}
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[0.5rem] text-muted">
              <CalendarClock className="size-2.5" />
              返済終了予定
            </p>
            <p className="mt-1 text-[0.68rem] font-bold text-ink">
              {summary.repaymentEndDate
                ? formatDateJa(summary.repaymentEndDate)
                : '—'}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-line/70">
          <div className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-2.5">
            <p className="text-[0.58rem] font-bold text-ink">返済履歴</p>
            <Button variant="outline" size="sm" onClick={onAddPayment}>
              <Plus className="size-3" />
              返済を記録
            </Button>
          </div>
          {payments.length === 0 ? (
            <p className="px-3 py-3 text-[0.58rem] text-muted">
              返済記録はまだありません。返済したら元金を記録すると残高が更新されます。
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[0.66rem] font-semibold text-ink">
                      {formatDateJa(payment.paidAt)} ·{' '}
                      {formatYen(payment.amount)}
                    </p>
                    <p className="mt-0.5 text-[0.54rem] text-muted tabular">
                      元金 {formatYen(payment.principalAmount)}
                      {payment.interestAmount > 0
                        ? ` / 利息 ${formatYen(payment.interestAmount)}`
                        : ''}
                      {' · '}残高 {formatYen(payment.balanceAfter)}
                    </p>
                    {payment.notes ? (
                      <p className="mt-0.5 truncate text-[0.54rem] text-muted">
                        {payment.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${formatDateJa(payment.paidAt)}の返済記録を編集`}
                      onClick={() => onEditPayment(payment)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${formatDateJa(payment.paidAt)}の返済記録を削除`}
                      className="text-muted hover:text-danger"
                      onClick={() => onDeletePayment(payment)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {summary.notes ? (
          <p className="mt-2 text-[0.56rem] leading-relaxed text-muted/80">
            {summary.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
