import { useRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Loan, LoanPayment } from '../../db/schema'
import {
  formatYen,
  toDateOnlyString,
  todayDateOnly,
} from '../../lib/format'
import { parseYenInput } from '../../lib/utils'
import { saveLoanPayment } from '../../server/actions'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import {
  Field,
  FieldGrid,
  Input,
  MoneyInput,
  Textarea,
} from '../ui/form'

type PaymentFormValues = {
  paidAt: string
  amount: string
  principalAmount: string
  interestAmount: string
  notes: string
}

function newValues(loan: Loan): PaymentFormValues {
  const payment = loan.monthlyPayment > 0 ? String(loan.monthlyPayment) : ''
  return {
    paidAt: toDateOnlyString(todayDateOnly()),
    amount: payment,
    principalAmount: payment,
    interestAmount: '',
    notes: '',
  }
}

function valuesFromPayment(payment: LoanPayment): PaymentFormValues {
  return {
    paidAt: payment.paidAt,
    amount: payment.amount > 0 ? String(payment.amount) : '',
    principalAmount:
      payment.principalAmount > 0 ? String(payment.principalAmount) : '',
    interestAmount:
      payment.interestAmount > 0 ? String(payment.interestAmount) : '',
    notes: payment.notes ?? '',
  }
}

export function LoanPaymentDialog({
  open,
  onOpenChange,
  loan,
  payment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
  payment: LoanPayment | null
}) {
  const router = useRouter()
  const [form, setForm] = useState<PaymentFormValues>({
    paidAt: '',
    amount: '',
    principalAmount: '',
    interestAmount: '',
    notes: '',
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !loan) return
    setForm(payment ? valuesFromPayment(payment) : newValues(loan))
    setError(null)
  }, [open, loan, payment])

  function update<K extends keyof PaymentFormValues>(
    key: K,
    next: PaymentFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: next }))
  }

  const principalAmount = Math.max(0, parseYenInput(form.principalAmount))
  const availableBalance =
    (loan?.currentBalance ?? 0) + (payment?.principalAmount ?? 0)
  const nextBalance = Math.max(0, availableBalance - principalAmount)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!loan) return
    if (!form.paidAt) {
      setError('返済日を入力してください')
      return
    }
    if (principalAmount > availableBalance) {
      setError('現在の残高を超える元金は記録できません')
      return
    }
    setPending(true)
    setError(null)
    try {
      await saveLoanPayment({
        data: {
          id: payment?.id,
          loanId: loan.id,
          paidAt: form.paidAt,
          amount: Math.max(0, parseYenInput(form.amount)),
          principalAmount,
          interestAmount: Math.max(
            0,
            parseYenInput(form.interestAmount),
          ),
          notes: form.notes.trim() || null,
        },
      })
      toast.success(
        payment ? '返済記録を更新しました' : '返済を記録しました',
      )
      await router.invalidate()
      onOpenChange(false)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : '保存に失敗しました'
      setError(message)
      toast.error(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={payment ? '返済記録を編集' : '返済を記録'}
      description={
        loan
          ? `${loan.name}の返済を記録します。入力した元金が現在の残高から差し引かれます。`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="submit" form="loan-payment-form" disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {pending ? '保存中…' : payment ? '更新する' : '記録する'}
          </Button>
        </>
      }
    >
      <form
        id="loan-payment-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <Field label="返済日" htmlFor="payment-date">
          <Input
            id="payment-date"
            type="date"
            value={form.paidAt}
            onChange={(event) => update('paidAt', event.target.value)}
            required
          />
        </Field>

        <FieldGrid>
          <Field label="返済額" htmlFor="payment-amount">
            <MoneyInput
              id="payment-amount"
              value={form.amount}
              onChange={(event) => update('amount', event.target.value)}
              placeholder="0"
            />
          </Field>
          <Field
            label="うち元金"
            htmlFor="payment-principal"
            hint="この金額が残高から差し引かれます。"
          >
            <MoneyInput
              id="payment-principal"
              value={form.principalAmount}
              onChange={(event) =>
                update('principalAmount', event.target.value)
              }
              placeholder="0"
            />
          </Field>
        </FieldGrid>

        <Field
          label="うち利息"
          htmlFor="payment-interest"
          hint="利息は残高から差し引かれません。"
        >
          <MoneyInput
            id="payment-interest"
            value={form.interestAmount}
            onChange={(event) =>
              update('interestAmount', event.target.value)
            }
            placeholder="0"
          />
        </Field>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line/80 bg-line/70">
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">返済前の残高</p>
            <p className="mt-1 text-[0.72rem] font-bold text-ink tabular">
              {formatYen(availableBalance)}
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">返済後の残高</p>
            <p className="mt-1 text-[0.72rem] font-bold text-ink tabular">
              {formatYen(nextBalance)}
            </p>
          </div>
        </div>

        <Field label="メモ" htmlFor="payment-notes">
          <Textarea
            id="payment-notes"
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
            maxLength={1000}
            placeholder="引き落とし月、繰上返済など"
          />
        </Field>

        {error ? (
          <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.68rem] text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
