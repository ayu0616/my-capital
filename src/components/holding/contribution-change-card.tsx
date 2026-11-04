import { useRouter } from '@tanstack/react-router'
import { History, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type {
  HoldingContributionChange,
  HoldingStockStatus,
} from '../../db/schema'
import {
  currentYearMonth,
  formatPercent,
  formatYearMonth,
  formatYen,
} from '../../lib/format'
import { parseNumberInput, parseYenInput } from '../../lib/utils'
import {
  deleteHoldingContributionChange,
  saveHoldingContributionChange,
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
import { Badge, Field, FieldGrid, Input, MoneyInput } from '../ui/form'

type ContributionChangeFormValues = {
  effectiveMonth: string
  monthlyContribution: string
  incentivePercent: string
}

function valuesFromChange(
  change: HoldingContributionChange,
): ContributionChangeFormValues {
  return {
    effectiveMonth: change.effectiveMonth,
    monthlyContribution: String(change.monthlyContribution),
    incentivePercent: String(change.incentiveRate * 100),
  }
}

function newValues(
  holding: HoldingStockStatus,
): ContributionChangeFormValues {
  return {
    effectiveMonth: currentYearMonth(),
    monthlyContribution: String(holding.monthlyContribution),
    incentivePercent: String(holding.companyIncentiveRate * 100),
  }
}

export function ContributionChangeCard({
  holding,
  changes,
  className,
}: {
  holding: HoldingStockStatus
  changes: HoldingContributionChange[]
  className?: string
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<HoldingContributionChange | null>(null)
  const [deleting, setDeleting] = useState<HoldingContributionChange | null>(
    null,
  )
  const [deletePending, setDeletePending] = useState(false)

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(change: HoldingContributionChange) {
    setEditing(change)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteHoldingContributionChange({ data: { id: deleting.id } })
      toast.success('拠出設定の変更履歴を削除しました')
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
          <CardKicker>Contribution history</CardKicker>
          <CardTitle className="mt-1.5">拠出設定の変更履歴</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={openNew}>
          <Plus className="size-3.5" />
          変更を追加
        </Button>
      </CardHeader>

      <CardContent>
        <p className="mb-4 text-[0.58rem] leading-relaxed text-muted">
          月額拠出や奨励金率が変わった月を記録します。拠出開始年月から現在までの自己負担累計を、この履歴で計算します。
        </p>

        {changes.length === 0 ? (
          <EmptyState
            icon={History}
            title="拠出設定の変更履歴はありません"
            description="変更があった月だけを記録します。月ごとの明細を作る必要はありません。"
            action={
              <Button size="sm" onClick={openNew}>
                <Plus className="size-3.5" />
                最初の変更を追加
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line/70">
            {changes.map((change) => (
              <li key={change.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[0.72rem] font-bold text-ink">
                        {formatYearMonth(change.effectiveMonth)}から
                      </p>
                      <Badge variant="outline" className="text-[0.55rem]">
                        奨励金 {formatPercent(change.incentiveRate, 0)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[0.62rem] text-muted">
                      月額拠出 {formatYen(change.monthlyContribution)} · 購入額{' '}
                      {formatYen(
                        change.monthlyContribution * (1 + change.incentiveRate),
                      )}
                    </p>
                  </div>
                  <div className="mt-0.5 flex shrink-0 justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${formatYearMonth(change.effectiveMonth)}からの拠出設定を編集`}
                      onClick={() => openEdit(change)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${formatYearMonth(change.effectiveMonth)}からの拠出設定を削除`}
                      className="text-muted hover:text-danger"
                      onClick={() => setDeleting(change)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ContributionChangeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        holding={holding}
        change={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onConfirm={confirmDelete}
        pending={deletePending}
        title="拠出設定の変更履歴を削除しますか？"
        description={
          deleting
            ? `${formatYearMonth(deleting.effectiveMonth)}からの月額拠出 ${formatYen(deleting.monthlyContribution)} の記録を削除します。`
            : ''
        }
      />
    </Card>
  )
}

function ContributionChangeDialog({
  open,
  onOpenChange,
  holding,
  change,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  holding: HoldingStockStatus
  change: HoldingContributionChange | null
}) {
  const router = useRouter()
  const [form, setForm] = useState<ContributionChangeFormValues>(() =>
    newValues(holding),
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(change ? valuesFromChange(change) : newValues(holding))
    setError(null)
  }, [open, change, holding])

  const monthlyContribution = parseYenInput(form.monthlyContribution)
  const incentivePercent = Math.max(
    0,
    Math.min(100, parseNumberInput(form.incentivePercent)),
  )

  function update<K extends keyof ContributionChangeFormValues>(
    key: K,
    next: ContributionChangeFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: next }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.effectiveMonth)) {
      setError('適用開始年月を入力してください')
      return
    }
    setPending(true)
    setError(null)
    try {
      await saveHoldingContributionChange({
        data: {
          id: change?.id,
          effectiveMonth: form.effectiveMonth,
          monthlyContribution,
          incentiveRate: incentivePercent / 100,
        },
      })
      toast.success(
        change ? '拠出設定の変更履歴を更新しました' : '拠出設定の変更を追加しました',
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
      title={change ? '拠出設定の変更を編集' : '拠出設定の変更を追加'}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            type="submit"
            form="contribution-change-form"
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {pending ? '保存中…' : change ? '更新する' : '追加する'}
          </Button>
        </>
      }
    >
      <form
        id="contribution-change-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <FieldGrid>
          <Field
            label="適用開始年月"
            htmlFor="contribution-month"
            hint="この月から下の設定が適用されます。"
          >
            <Input
              id="contribution-month"
              type="month"
              value={form.effectiveMonth}
              onChange={(event) =>
                update('effectiveMonth', event.target.value)
              }
              required
            />
          </Field>
          <Field label="月次拠出額" htmlFor="contribution-amount">
            <MoneyInput
              id="contribution-amount"
              value={form.monthlyContribution}
              onChange={(event) =>
                update('monthlyContribution', event.target.value)
              }
            />
          </Field>
          <Field label="奨励金率" htmlFor="contribution-incentive">
            <div className="relative">
              <Input
                id="contribution-incentive"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.incentivePercent}
                onChange={(event) =>
                  update('incentivePercent', event.target.value)
                }
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.68rem] text-muted">
                %
              </span>
            </div>
          </Field>
        </FieldGrid>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line/80 bg-line/70">
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">月額拠出</p>
            <p className="mt-1 text-[0.72rem] font-bold text-ink tabular">
              {formatYen(monthlyContribution)}
            </p>
          </div>
          <div className="bg-canvas/35 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">購入額（奨励金込み）</p>
            <p className="mt-1 text-[0.72rem] font-bold text-ink tabular">
              {formatYen(monthlyContribution * (1 + incentivePercent / 100))}
            </p>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.7rem] text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
