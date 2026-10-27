import { useRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Loan } from '../../db/schema'
import {
  formatYen,
  toDateOnlyString,
  todayDateOnly,
} from '../../lib/format'
import { parseNumberInput, parseYenInput } from '../../lib/utils'
import { saveLoan } from '../../server/actions'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import {
  Field,
  FieldGrid,
  Input,
  MoneyInput,
  Select,
  Textarea,
} from '../ui/form'

type LoanFormValues = {
  name: string
  lender: string
  kind: 'scholarship' | 'loan' | 'other'
  principalAmount: string
  currentBalance: string
  interestRate: string
  monthlyPayment: string
  borrowedAt: string
  repaymentEndDate: string
  notes: string
}

function newValues(): LoanFormValues {
  return {
    name: '',
    lender: '',
    kind: 'scholarship',
    principalAmount: '',
    currentBalance: '',
    interestRate: '',
    monthlyPayment: '',
    borrowedAt: toDateOnlyString(todayDateOnly()),
    repaymentEndDate: '',
    notes: '',
  }
}

function valuesFromLoan(loan: Loan): LoanFormValues {
  return {
    name: loan.name,
    lender: loan.lender,
    kind:
      loan.kind === 'loan' || loan.kind === 'other'
        ? loan.kind
        : 'scholarship',
    principalAmount:
      loan.principalAmount > 0 ? String(loan.principalAmount) : '',
    currentBalance:
      loan.currentBalance > 0 ? String(loan.currentBalance) : '',
    interestRate: loan.interestRate > 0 ? String(loan.interestRate) : '',
    monthlyPayment:
      loan.monthlyPayment > 0 ? String(loan.monthlyPayment) : '',
    borrowedAt: loan.borrowedAt,
    repaymentEndDate: loan.repaymentEndDate,
    notes: loan.notes ?? '',
  }
}

export function LoanDialog({
  open,
  onOpenChange,
  loan,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
}) {
  const router = useRouter()
  const [form, setForm] = useState<LoanFormValues>(newValues)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(loan ? valuesFromLoan(loan) : newValues())
    setError(null)
  }, [open, loan])

  function update<K extends keyof LoanFormValues>(
    key: K,
    next: LoanFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: next }))
  }

  const currentBalance = Math.max(0, parseYenInput(form.currentBalance))
  const monthlyPayment = Math.max(0, parseYenInput(form.monthlyPayment))
  const remainingPayments =
    currentBalance > 0 && monthlyPayment > 0
      ? Math.ceil(currentBalance / monthlyPayment)
      : null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('名称を入力してください')
      return
    }
    if (!form.borrowedAt) {
      setError('借入日を入力してください')
      return
    }
    setPending(true)
    setError(null)
    try {
      await saveLoan({
        data: {
          id: loan?.id,
          name: form.name.trim(),
          lender: form.lender.trim(),
          kind: form.kind,
          principalAmount: Math.max(0, parseYenInput(form.principalAmount)),
          currentBalance,
          interestRate: Math.min(
            100,
            Math.max(0, parseNumberInput(form.interestRate)),
          ),
          monthlyPayment,
          borrowedAt: form.borrowedAt,
          repaymentEndDate: form.repaymentEndDate,
          notes: form.notes.trim() || null,
        },
      })
      toast.success(
        loan ? '奨学金・ローンの記録を更新しました' : '奨学金・ローンを追加しました',
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
      title={loan ? '奨学金・ローンを編集' : '奨学金・ローンを追加'}
      description="借入額と現在の残高を登録します。残高は返済記録からも更新できます。"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="submit" form="loan-form" disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {pending ? '保存中…' : loan ? '更新する' : '追加する'}
          </Button>
        </>
      }
    >
      <form id="loan-form" onSubmit={handleSubmit} className="space-y-5">
        <FieldGrid>
          <Field label="名称" htmlFor="loan-name">
            <Input
              id="loan-name"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="第一種奨学金"
              maxLength={120}
              required
            />
          </Field>
          <Field
            label="借入先"
            htmlFor="loan-lender"
            hint="日本学生支援機構、銀行など。"
          >
            <Input
              id="loan-lender"
              value={form.lender}
              onChange={(event) => update('lender', event.target.value)}
              placeholder="日本学生支援機構"
              maxLength={120}
            />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field label="種類" htmlFor="loan-kind">
            <Select
              id="loan-kind"
              value={form.kind}
              onChange={(event) =>
                update(
                  'kind',
                  event.target.value as LoanFormValues['kind'],
                )
              }
            >
              <option value="scholarship">奨学金</option>
              <option value="loan">ローン</option>
              <option value="other">その他</option>
            </Select>
          </Field>
          <Field
            label="借入額"
            htmlFor="loan-principal"
            hint="借りた金額の合計。返済進捗の分母にします。"
          >
            <MoneyInput
              id="loan-principal"
              value={form.principalAmount}
              onChange={(event) =>
                update('principalAmount', event.target.value)
              }
              placeholder="0"
            />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field
            label="現在の残高"
            htmlFor="loan-balance"
            hint="返済を記録すると自動で減ります。直接修正もできます。"
          >
            <MoneyInput
              id="loan-balance"
              value={form.currentBalance}
              onChange={(event) =>
                update('currentBalance', event.target.value)
              }
              placeholder="0"
            />
          </Field>
          <Field label="月額返済" htmlFor="loan-monthly">
            <MoneyInput
              id="loan-monthly"
              value={form.monthlyPayment}
              onChange={(event) =>
                update('monthlyPayment', event.target.value)
              }
              placeholder="0"
            />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field label="借入日" htmlFor="loan-borrowed-at">
            <Input
              id="loan-borrowed-at"
              type="date"
              value={form.borrowedAt}
              onChange={(event) => update('borrowedAt', event.target.value)}
              required
            />
          </Field>
          <Field
            label="返済終了予定日"
            htmlFor="loan-end-date"
            hint="任意。入力すると残り月数を表示します。"
          >
            <Input
              id="loan-end-date"
              type="date"
              value={form.repaymentEndDate}
              onChange={(event) =>
                update('repaymentEndDate', event.target.value)
              }
            />
          </Field>
        </FieldGrid>

        <Field
          label="金利（年率）"
          htmlFor="loan-interest"
          hint="任意。返済額の内訳を記録するときの目安です。"
        >
          <div className="relative">
            <Input
              id="loan-interest"
              inputMode="decimal"
              value={form.interestRate}
              onChange={(event) =>
                update('interestRate', event.target.value)
              }
              placeholder="0"
              className="pr-8 tabular"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.68rem] text-muted">
              %
            </span>
          </div>
        </Field>

        {remainingPayments != null ? (
          <p className="rounded-xl border border-brand/10 bg-brand-soft/45 px-3.5 py-3 text-[0.6rem] leading-relaxed text-brand-ink">
            月{formatYen(monthlyPayment)}の返済なら、単純計算で残り
            {remainingPayments}回です。利息・手数料は含みません。
          </p>
        ) : null}

        <Field label="メモ" htmlFor="loan-notes">
          <Textarea
            id="loan-notes"
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
            maxLength={1000}
            placeholder="返済計画、利率の見直し予定など"
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
