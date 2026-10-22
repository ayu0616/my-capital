import { useRouter } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { HoldingStockStatus, HoldingWithdrawal } from '../../db/schema'
import {
  formatDateJa,
  formatSignedPercent,
  formatYen,
  toDateOnlyString,
  todayDateOnly,
} from '../../lib/format'
import { parseNumberInput } from '../../lib/utils'
import {
  deleteHoldingWithdrawal,
  saveHoldingWithdrawal,
} from '../../server/actions'
import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardKicker,
  CardTitle,
} from '../ui/card'
import { ConfirmDialog, Dialog } from '../ui/dialog'
import { EmptyState } from '../ui/empty-state'
import {
  Badge,
  Field,
  FieldGrid,
  Input,
  MoneyInput,
  Textarea,
} from '../ui/form'

type WithdrawalFormValues = {
  withdrawnAt: string
  shares: string
  averageAcquisitionPrice: string
  stockPrice: string
  destination: string
  notes: string
}

function valuesFromWithdrawal(withdrawal: HoldingWithdrawal): WithdrawalFormValues {
  return {
    withdrawnAt: withdrawal.withdrawnAt,
    shares: String(withdrawal.shares),
    averageAcquisitionPrice: withdrawal.averageAcquisitionPrice
      ? String(withdrawal.averageAcquisitionPrice)
      : '',
    stockPrice: withdrawal.stockPrice ? String(withdrawal.stockPrice) : '',
    destination: withdrawal.destination,
    notes: withdrawal.notes ?? '',
  }
}

function newValues(
  holding: HoldingStockStatus,
  remainingShares: number,
): WithdrawalFormValues {
  return {
    withdrawnAt: toDateOnlyString(todayDateOnly()),
    shares: remainingShares > 0 ? String(remainingShares) : '',
    averageAcquisitionPrice: holding.averageAcquisitionPrice
      ? String(holding.averageAcquisitionPrice)
      : '',
    stockPrice: holding.latestStockPrice
      ? String(holding.latestStockPrice)
      : '',
    destination: 'SMBC日興証券',
    notes: '',
  }
}

export function WithdrawalCard({
  holding,
  withdrawals,
  className,
}: {
  holding: HoldingStockStatus
  withdrawals: HoldingWithdrawal[]
  className?: string
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<HoldingWithdrawal | null>(null)
  const [deleting, setDeleting] = useState<HoldingWithdrawal | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const totalShares = withdrawals.reduce(
    (sum, withdrawal) => sum + withdrawal.shares,
    0,
  )
  const totalValue = withdrawals.reduce(
    (sum, withdrawal) => sum + withdrawal.shares * withdrawal.stockPrice,
    0,
  )
  const totalCost = withdrawals.reduce(
    (sum, withdrawal) =>
      sum + withdrawal.shares * withdrawal.averageAcquisitionPrice,
    0,
  )
  const hasCost = withdrawals.some(
    (withdrawal) => withdrawal.averageAcquisitionPrice > 0,
  )
  const gain = hasCost ? totalValue - totalCost : null
  const gainRatio =
    gain != null && totalCost > 0 ? gain / totalCost : null

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(withdrawal: HoldingWithdrawal) {
    setEditing(withdrawal)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteHoldingWithdrawal({ data: { id: deleting.id } })
      toast.success('引出しの記録を削除し、持株会の株数に戻しました')
      setDeleting(null)
      await router.invalidate()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : '削除に失敗しました',
      )
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Holding withdrawal</CardKicker>
          <CardTitle className="mt-1.5">持株会の引出し</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={openNew}>
          <Plus className="size-3.5" />
          引出しを記録
        </Button>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">引出し済み</p>
            <p className="mt-1 text-[0.82rem] font-bold text-ink tabular">
              {totalShares.toFixed(1)}株
            </p>
          </div>
          <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">評価額</p>
            <p className="mt-1 text-[0.82rem] font-bold text-ink tabular">
              {formatYen(totalValue)}
            </p>
          </div>
          <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">取得原価</p>
            <p className="mt-1 text-[0.82rem] font-bold text-ink tabular">
              {hasCost ? formatYen(totalCost) : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">評価損益</p>
            <p
              className={
                gain != null && gain < 0
                  ? 'mt-1 text-[0.82rem] font-bold text-danger tabular'
                  : 'mt-1 text-[0.82rem] font-bold text-ink tabular'
              }
            >
              {gain == null ? '—' : formatYen(gain, { sign: true })}
            </p>
            {gainRatio != null ? (
              <p className="mt-0.5 text-[0.5rem] text-muted tabular">
                {formatSignedPercent(gainRatio)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          {withdrawals.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="引出しの記録はありません"
              description="持株会からSMBC日興証券へ株式を移したときに、日付・株数・株価を記録します。"
              action={
                <Button size="sm" onClick={openNew}>
                  <ArrowUpRight className="size-3.5" />
                  最初の引出しを記録
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line/70">
              {withdrawals.map((withdrawal) => {
                const value = withdrawal.shares * withdrawal.stockPrice
                const cost =
                  withdrawal.averageAcquisitionPrice > 0
                    ? withdrawal.shares *
                      withdrawal.averageAcquisitionPrice
                    : null
                const recordGain = cost != null ? value - cost : null
                return (
                  <li key={withdrawal.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[0.72rem] font-bold text-ink">
                            {formatDateJa(withdrawal.withdrawnAt)}
                          </p>
                          <Badge variant="outline" className="text-[0.55rem]">
                            {withdrawal.destination}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[0.62rem] text-muted">
                          {withdrawal.shares.toFixed(1)}株 · 株価{' '}
                          {formatYen(withdrawal.stockPrice)}
                          {withdrawal.averageAcquisitionPrice > 0
                            ? ` · 平均 ${formatYen(withdrawal.averageAcquisitionPrice)}`
                            : ''}
                        </p>
                        {withdrawal.notes ? (
                          <p className="mt-1 max-w-md text-[0.58rem] leading-relaxed text-muted/80">
                            {withdrawal.notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[0.74rem] font-bold text-ink tabular">
                          {formatYen(value)}
                        </p>
                        {recordGain != null ? (
                          <p
                            className={
                              recordGain < 0
                                ? 'mt-0.5 text-[0.56rem] text-danger tabular'
                                : 'mt-0.5 text-[0.56rem] text-positive tabular'
                            }
                          >
                            {formatYen(recordGain, { sign: true })}
                          </p>
                        ) : null}
                        <div className="mt-1 flex justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${formatDateJa(withdrawal.withdrawnAt)}の引出しを編集`}
                            onClick={() => openEdit(withdrawal)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${formatDateJa(withdrawal.withdrawnAt)}の引出しを削除`}
                            className="text-muted hover:text-danger"
                            onClick={() => setDeleting(withdrawal)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </CardContent>

      <WithdrawalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        holding={holding}
        withdrawal={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onConfirm={confirmDelete}
        pending={deletePending}
        title="引出しの記録を削除しますか？"
        description={
          deleting
            ? `${formatDateJa(deleting.withdrawnAt)}の${deleting.shares.toFixed(1)}株を削除し、持株会の現在株数に戻します。`
            : ''
        }
      />
    </Card>
  )
}

function WithdrawalDialog({
  open,
  onOpenChange,
  holding,
  withdrawal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  holding: HoldingStockStatus
  withdrawal: HoldingWithdrawal | null
}) {
  const router = useRouter()
  const [form, setForm] = useState<WithdrawalFormValues>(() =>
    newValues(holding, holding.currentAccumulatedShares),
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(
      withdrawal
        ? valuesFromWithdrawal(withdrawal)
        : newValues(holding, holding.currentAccumulatedShares),
    )
    setError(null)
  }, [open, withdrawal, holding])

  const shares = Math.max(0, parseNumberInput(form.shares))
  const stockPrice = Math.max(0, parseNumberInput(form.stockPrice))
  const averagePrice = Math.max(0, parseNumberInput(form.averageAcquisitionPrice))
  const value = shares * stockPrice
  const cost = averagePrice > 0 ? shares * averagePrice : null
  const gain = cost != null ? value - cost : null
  const maxShares =
    holding.currentAccumulatedShares + (withdrawal?.shares ?? 0) + 0.0001

  function update<K extends keyof WithdrawalFormValues>(
    key: K,
    next: WithdrawalFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: next }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (shares <= 0) {
      setError('株数を入力してください')
      return
    }
    if (shares > maxShares) {
      setError(
        `持株会の現在株数（${holding.currentAccumulatedShares.toFixed(1)}株）を超えています`,
      )
      return
    }
    setPending(true)
    setError(null)
    try {
      await saveHoldingWithdrawal({
        data: {
          id: withdrawal?.id,
          withdrawnAt: form.withdrawnAt,
          shares,
          averageAcquisitionPrice: averagePrice,
          stockPrice,
          destination: form.destination.trim() || 'SMBC日興証券',
          notes: form.notes.trim() || null,
        },
      })
      toast.success(
        withdrawal ? '引出しの記録を更新しました' : '引出しを記録しました',
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
      title={withdrawal ? '引出しの記録を編集' : '持株会から引き出す'}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            type="submit"
            form="withdrawal-form"
            disabled={pending || shares <= 0}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {pending ? '保存中…' : withdrawal ? '更新する' : '記録する'}
          </Button>
        </>
      }
    >
      <form id="withdrawal-form" onSubmit={handleSubmit} className="space-y-5">
        <FieldGrid>
          <Field label="引出し日" htmlFor="withdrawal-date">
            <Input
              id="withdrawal-date"
              type="date"
              value={form.withdrawnAt}
              onChange={(event) => update('withdrawnAt', event.target.value)}
              required
            />
          </Field>
          <Field
            label="引出し株数"
            htmlFor="withdrawal-shares"
            hint={`持株会の現在株数は ${holding.currentAccumulatedShares.toFixed(1)}株です。`}
          >
            <Input
              id="withdrawal-shares"
              inputMode="decimal"
              value={form.shares}
              onChange={(event) => update('shares', event.target.value)}
              className="tabular"
              required
            />
          </Field>
          <Field
            label="平均取得単価"
            htmlFor="withdrawal-average"
            hint="持株会の平均取得単価が初期値です。"
          >
            <MoneyInput
              id="withdrawal-average"
              inputMode="decimal"
              value={form.averageAcquisitionPrice}
              onChange={(event) =>
                update('averageAcquisitionPrice', event.target.value)
              }
              placeholder="0"
            />
          </Field>
          <Field
            label="引出し時の株価"
            htmlFor="withdrawal-price"
            hint="評価額の計算に使います。"
          >
            <MoneyInput
              id="withdrawal-price"
              inputMode="decimal"
              value={form.stockPrice}
              onChange={(event) => update('stockPrice', event.target.value)}
              placeholder="0"
            />
          </Field>
        </FieldGrid>

        <Field
          label="引出し先"
          htmlFor="withdrawal-destination"
          hint="持株会から移す証券口座です。"
        >
          <Input
            id="withdrawal-destination"
            value={form.destination}
            onChange={(event) => update('destination', event.target.value)}
            maxLength={80}
            required
          />
        </Field>

        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line/80 bg-line/70">
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">評価額</p>
            <p className="mt-1 text-[0.72rem] font-bold text-ink tabular">
              {formatYen(value)}
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">取得原価</p>
            <p className="mt-1 text-[0.72rem] font-bold text-ink tabular">
              {cost == null ? '—' : formatYen(cost)}
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">評価損益</p>
            <p
              className={
                gain != null && gain < 0
                  ? 'mt-1 text-[0.72rem] font-bold text-danger tabular'
                  : 'mt-1 text-[0.72rem] font-bold text-ink tabular'
              }
            >
              {gain == null ? '—' : formatYen(gain, { sign: true })}
            </p>
          </div>
        </div>

        <Field label="メモ" htmlFor="withdrawal-notes">
          <Textarea
            id="withdrawal-notes"
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
            placeholder="例: 単元達成後にSMBC日興証券へ移した。"
            maxLength={1000}
          />
        </Field>

        {error ? (
          <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.7rem] text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
