import { useRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { StockGoal } from '../../db/schema'
import { formatYen, todayDateOnly } from '../../lib/format'
import { parseNumberInput, parseYenInput } from '../../lib/utils'
import { saveStockGoal } from '../../server/actions'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import {
  Field,
  FieldGrid,
  Input,
  MoneyInput,
  Textarea,
} from '../ui/form'

type StockGoalFormValues = {
  code: string
  name: string
  account: string
  targetShares: string
  currentShares: string
  targetDate: string
  minimumPurchaseUnit: string
  averageAcquisitionPrice: string
  currentPrice: string
  monthlyBudget: string
  benefitNote: string
  notes: string
  autoUpdateFromCsv: boolean
}

function nextMarch31(): string {
  const today = todayDateOnly()
  const year =
    today.getUTCMonth() > 2
      ? today.getUTCFullYear() + 1
      : today.getUTCFullYear()
  return `${year}-03-31`
}

function newValues(): StockGoalFormValues {
  return {
    code: '',
    name: '',
    account: '楽天証券',
    targetShares: '100',
    currentShares: '0',
    targetDate: nextMarch31(),
    minimumPurchaseUnit: '1',
    averageAcquisitionPrice: '',
    currentPrice: '',
    monthlyBudget: '',
    benefitNote: '',
    notes: '',
    autoUpdateFromCsv: true,
  }
}

function valuesFromGoal(goal: StockGoal): StockGoalFormValues {
  return {
    code: goal.code,
    name: goal.name,
    account: goal.account,
    targetShares: String(goal.targetShares),
    currentShares: String(goal.currentShares),
    targetDate: goal.targetDate,
    minimumPurchaseUnit: String(goal.minimumPurchaseUnit),
    averageAcquisitionPrice:
      goal.averageAcquisitionPrice > 0
        ? String(goal.averageAcquisitionPrice)
        : '',
    currentPrice: goal.currentPrice > 0 ? String(goal.currentPrice) : '',
    monthlyBudget: goal.monthlyBudget > 0 ? String(goal.monthlyBudget) : '',
    benefitNote: goal.benefitNote,
    notes: goal.notes ?? '',
    autoUpdateFromCsv: goal.autoUpdateFromCsv === 1,
  }
}

export function StockGoalDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: StockGoal | null
}) {
  const router = useRouter()
  const [form, setForm] = useState<StockGoalFormValues>(newValues)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(goal ? valuesFromGoal(goal) : newValues())
    setError(null)
  }, [open, goal])

  function update<K extends keyof StockGoalFormValues>(
    key: K,
    next: StockGoalFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: next }))
  }

  const targetShares = Math.max(0, parseNumberInput(form.targetShares))
  const currentShares = Math.max(0, parseNumberInput(form.currentShares))
  const minimumPurchaseUnit = Math.max(
    1,
    Math.floor(parseNumberInput(form.minimumPurchaseUnit) || 1),
  )
  const currentPrice = Math.max(0, parseYenInput(form.currentPrice))
  const monthlyBudget = Math.max(0, parseYenInput(form.monthlyBudget))
  const remainingShares = Math.max(0, targetShares - currentShares)
  const monthlyShares =
    currentPrice > 0 && monthlyBudget > 0 ? monthlyBudget / currentPrice : null
  const estimatedMonths =
    monthlyShares != null && monthlyShares > 0
      ? Math.ceil(remainingShares / monthlyShares)
      : null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('銘柄名を入力してください')
      return
    }
    if (targetShares <= 0) {
      setError('目標株数を入力してください')
      return
    }
    if (!form.targetDate) {
      setError('目標期限を入力してください')
      return
    }
    setPending(true)
    setError(null)
    try {
      await saveStockGoal({
        data: {
          id: goal?.id,
          code: form.code.trim(),
          name: form.name.trim(),
          account: form.account.trim() || '楽天証券',
          targetShares,
          currentShares,
          targetDate: form.targetDate,
          minimumPurchaseUnit,
          averageAcquisitionPrice: Math.max(
            0,
            parseYenInput(form.averageAcquisitionPrice),
          ),
          currentPrice,
          monthlyBudget,
          benefitNote: form.benefitNote.trim(),
          notes: form.notes.trim() || null,
          autoUpdateFromCsv: form.autoUpdateFromCsv,
        },
      })
      toast.success(
        goal ? '優待株の目標を更新しました' : '優待株の目標を追加しました',
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
      title={goal ? '優待株の目標を編集' : '優待株の目標を追加'}
      description="目標株数と期限から、必要な購入ペースを計算します。"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="submit" form="stock-goal-form" disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {pending ? '保存中…' : goal ? '更新する' : '追加する'}
          </Button>
        </>
      }
    >
      <form id="stock-goal-form" onSubmit={handleSubmit} className="space-y-5">
        <FieldGrid>
          <Field
            label="銘柄コード"
            htmlFor="stock-goal-code"
            hint="楽天証券CSVとの照合に使います。例: 9021"
          >
            <Input
              id="stock-goal-code"
              value={form.code}
              onChange={(event) => update('code', event.target.value)}
              placeholder="9021"
              maxLength={40}
            />
          </Field>
          <Field label="銘柄名" htmlFor="stock-goal-name">
            <Input
              id="stock-goal-name"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="西日本旅客鉄道（JR西日本）"
              maxLength={120}
              required
            />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field
            label="目標株数"
            htmlFor="stock-goal-target"
            hint="優待の最低株数に合わせます。例: 100株"
          >
            <Input
              id="stock-goal-target"
              inputMode="decimal"
              value={form.targetShares}
              onChange={(event) => update('targetShares', event.target.value)}
              className="tabular"
              required
            />
          </Field>
          <Field
            label="現在株数"
            htmlFor="stock-goal-current"
            hint="CSV取り込みをオンにすると、CSVの数量で更新されます。"
          >
            <Input
              id="stock-goal-current"
              inputMode="decimal"
              value={form.currentShares}
              onChange={(event) => update('currentShares', event.target.value)}
              className="tabular"
            />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field label="目標期限" htmlFor="stock-goal-date">
            <Input
              id="stock-goal-date"
              type="date"
              value={form.targetDate}
              onChange={(event) => update('targetDate', event.target.value)}
              required
            />
          </Field>
          <Field
            label="最小購入単位"
            htmlFor="stock-goal-unit"
            hint="1株単位なら1、100株単位なら100。"
          >
            <Input
              id="stock-goal-unit"
              inputMode="numeric"
              value={form.minimumPurchaseUnit}
              onChange={(event) =>
                update('minimumPurchaseUnit', event.target.value)
              }
              className="tabular"
              required
            />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field label="口座" htmlFor="stock-goal-account">
            <Input
              id="stock-goal-account"
              value={form.account}
              onChange={(event) => update('account', event.target.value)}
              maxLength={80}
            />
          </Field>
          <Field
            label="平均取得単価"
            htmlFor="stock-goal-average"
            hint="評価損益の計算に使います。空欄なら計算しません。"
          >
            <MoneyInput
              id="stock-goal-average"
              inputMode="decimal"
              value={form.averageAcquisitionPrice}
              onChange={(event) =>
                update('averageAcquisitionPrice', event.target.value)
              }
              placeholder="0"
            />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field
            label="現在株価"
            htmlFor="stock-goal-price"
            hint="月あたりの購入株数と必要予算の計算に使います。"
          >
            <MoneyInput
              id="stock-goal-price"
              inputMode="decimal"
              value={form.currentPrice}
              onChange={(event) => update('currentPrice', event.target.value)}
              placeholder="0"
            />
          </Field>
          <Field
            label="月の購入予算"
            htmlFor="stock-goal-budget"
            hint="任意。入力すると、このペースで到達する月を表示します。"
          >
            <MoneyInput
              id="stock-goal-budget"
              inputMode="numeric"
              value={form.monthlyBudget}
              onChange={(event) => update('monthlyBudget', event.target.value)}
              placeholder="0"
            />
          </Field>
        </FieldGrid>

        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line/80 bg-line/70">
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">残り株数</p>
            <p className="mt-1 text-[0.72rem] font-bold text-ink tabular">
              {remainingShares.toLocaleString('ja-JP')}株
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">月あたり購入株数</p>
            <p className="mt-1 text-[0.72rem] font-bold text-ink tabular">
              {monthlyShares == null
                ? '—'
                : `${monthlyShares.toFixed(1)}株`}
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">到達までの月数</p>
            <p className="mt-1 text-[0.72rem] font-bold text-ink tabular">
              {estimatedMonths == null ? '—' : `${estimatedMonths}ヶ月`}
            </p>
          </div>
        </div>

        <Field
          label="優待内容"
          htmlFor="stock-goal-benefit"
          hint="例: 100株以上で株主優待。内容は変更されることがあるため、公式情報を確認してください。"
        >
          <Textarea
            id="stock-goal-benefit"
            value={form.benefitNote}
            onChange={(event) => update('benefitNote', event.target.value)}
            maxLength={1000}
            placeholder="100株以上で株主優待"
          />
        </Field>

        <Field label="メモ" htmlFor="stock-goal-notes">
          <Textarea
            id="stock-goal-notes"
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
            maxLength={1000}
            placeholder="購入予定、優待の利用予定など"
          />
        </Field>

        <label className="flex items-start gap-2.5 rounded-xl border border-line/80 bg-canvas/35 px-3.5 py-3 text-[0.66rem] font-medium text-ink">
          <input
            type="checkbox"
            checked={form.autoUpdateFromCsv}
            onChange={(event) =>
              update('autoUpdateFromCsv', event.target.checked)
            }
            className="mt-0.5 size-4 rounded border-line accent-brand"
          />
          <span>
            楽天証券CSVの取り込みで現在株数を更新する
            <span className="mt-0.5 block text-[0.54rem] leading-relaxed text-muted">
              銘柄コードが一致する保有銘柄がある場合、数量・株価・平均取得単価をCSVの値に合わせます。
            </span>
          </span>
        </label>

        {currentPrice > 0 && monthlyBudget > 0 ? (
          <p className="rounded-xl border border-brand/10 bg-brand-soft/45 px-3.5 py-3 text-[0.58rem] leading-relaxed text-brand-ink">
            月{formatYen(monthlyBudget)}のペースなら、単純計算で
            {estimatedMonths == null ? '—' : `${estimatedMonths}ヶ月後`}
            に目標株数へ到達します。手数料・税金・株価変動は含みません。
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.68rem] text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
