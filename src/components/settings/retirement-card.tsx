import { useRouter } from '@tanstack/react-router'
import {
  Building2,
  CalendarClock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type {
  RetirementAccount,
  RetirementAllocation,
} from '../../db/schema'
import {
  buildRetirementSummary,
} from '../../lib/finance'
import {
  formatDateJa,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatYen,
} from '../../lib/format'
import { parseNumberInput, parseYenInput } from '../../lib/utils'
import { saveRetirementAccount } from '../../server/actions'
import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardKicker,
  CardTitle,
} from '../ui/card'
import { Dialog } from '../ui/dialog'
import { EmptyState } from '../ui/empty-state'
import {
  Field,
  FieldGrid,
  Input,
  MoneyInput,
  Textarea,
} from '../ui/form'

const ALLOCATION_COLORS = ['#4F6B8A', '#5B9C82', '#C1913F', '#8A9C8D', '#AEB6AD']

type AllocationFormValue = {
  label: string
  ratio: string
}

type RetirementFormValues = {
  provider: string
  schemeName: string
  balance: string
  totalContributed: string
  monthlyContribution: string
  employerContribution: string
  valuedAt: string
  notes: string
  allocations: AllocationFormValue[]
}

function valuesFromAccount(
  account: RetirementAccount,
  allocations: RetirementAllocation[],
): RetirementFormValues {
  return {
    provider: account.provider,
    schemeName: account.schemeName,
    balance: account.balance > 0 ? String(account.balance) : '',
    totalContributed:
      account.totalContributed > 0 ? String(account.totalContributed) : '',
    monthlyContribution:
      account.monthlyContribution > 0
        ? String(account.monthlyContribution)
        : '',
    employerContribution:
      account.employerContribution > 0
        ? String(account.employerContribution)
        : '',
    valuedAt: account.valuedAt,
    notes: account.notes ?? '',
    allocations: allocations.map((allocation) => ({
      label: allocation.label,
      ratio: String(allocation.ratio),
    })),
  }
}

export function RetirementCard({
  account,
  allocations,
  className,
}: {
  account: RetirementAccount
  allocations: RetirementAllocation[]
  className?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<RetirementFormValues>(() =>
    valuesFromAccount(account, allocations),
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const summary = buildRetirementSummary(account, allocations)

  useEffect(() => {
    if (!open) return
    setForm(valuesFromAccount(account, allocations))
    setError(null)
  }, [open, account, allocations])

  function update<K extends keyof RetirementFormValues>(
    key: K,
    value: RetirementFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateAllocation(
    index: number,
    key: keyof AllocationFormValue,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      allocations: current.allocations.map((allocation, allocationIndex) =>
        allocationIndex === index
          ? { ...allocation, [key]: value }
          : allocation,
      ),
    }))
  }

  function addAllocation() {
    setForm((current) => ({
      ...current,
      allocations: [...current.allocations, { label: '', ratio: '' }],
    }))
  }

  function removeAllocation(index: number) {
    setForm((current) => ({
      ...current,
      allocations: current.allocations.filter(
        (_, allocationIndex) => allocationIndex !== index,
      ),
    }))
  }

  const ratioTotal = form.allocations.reduce(
    (sum, allocation) => sum + parseNumberInput(allocation.ratio),
    0,
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.provider.trim() || !form.schemeName.trim()) {
      setError('制度名を入力してください。')
      return
    }
    if (!form.valuedAt) {
      setError('基準日を入力してください。')
      return
    }
    if (ratioTotal > 100.01) {
      setError('配分の合計は100%以下にしてください。')
      return
    }
    setPending(true)
    setError(null)
    try {
      await saveRetirementAccount({
        data: {
          provider: form.provider.trim(),
          schemeName: form.schemeName.trim(),
          balance: parseYenInput(form.balance),
          totalContributed: parseYenInput(form.totalContributed),
          monthlyContribution: parseYenInput(form.monthlyContribution),
          employerContribution: parseYenInput(form.employerContribution),
          valuedAt: form.valuedAt,
          notes: form.notes.trim() || null,
          allocations: form.allocations
            .map((allocation) => ({
              label: allocation.label.trim(),
              ratio: parseNumberInput(allocation.ratio),
            }))
            .filter((allocation) => allocation.label.length > 0),
        },
      })
      toast.success('確定拠出年金の設定を更新しました')
      await router.invalidate()
      setOpen(false)
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
    <Card className={className} id="retirement">
      <CardHeader className="items-start">
        <div>
          <CardKicker>Defined contribution</CardKicker>
          <CardTitle className="mt-1.5">
            確定拠出年金（JIS&amp;T）
          </CardTitle>
          <CardDescription>
            会社型DCの評価額、累計拠出額、商品配分を管理します。
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="size-3.5" />
          編集
        </Button>
      </CardHeader>

      <CardContent className="pt-3">
        {summary.balance <= 0 && summary.totalContributed <= 0 ? (
          <EmptyState
            icon={Building2}
            title="確定拠出年金が未設定です"
            description="JIS&Tの評価額・累計拠出額・配分を登録すると、純資産とポートフォリオに反映されます。"
            action={
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="size-3.5" />
                設定する
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-brand/10 bg-brand-soft/45 px-4 py-4">
                <p className="text-[0.54rem] font-medium text-muted">評価額</p>
                <p className="mt-1 font-display text-[1.8rem] font-semibold leading-none text-ink tabular">
                  {formatYen(summary.balance)}
                </p>
                <p className="mt-2 text-[0.58rem] text-muted">
                  累計拠出比{' '}
                  <span
                    className={
                      summary.gain < 0
                        ? 'font-bold text-danger tabular'
                        : 'font-bold text-positive tabular'
                    }
                  >
                    {summary.totalContributed > 0
                      ? `${formatYen(summary.gain, { sign: true })}${
                          summary.gainRatio == null
                            ? ''
                            : `（${formatSignedPercent(summary.gainRatio)}）`
                        }`
                      : '—'}
                  </span>
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line/80 bg-line/70">
                <div className="bg-canvas/35 px-3 py-2.5">
                  <p className="text-[0.5rem] text-muted">累計拠出額</p>
                  <p className="mt-1 text-[0.7rem] font-bold text-ink tabular">
                    {formatYen(summary.totalContributed)}
                  </p>
                </div>
                <div className="bg-canvas/35 px-3 py-2.5">
                  <p className="text-[0.5rem] text-muted">月額拠出</p>
                  <p className="mt-1 text-[0.7rem] font-bold text-ink tabular">
                    {formatYen(summary.monthlyTotal)}
                  </p>
                </div>
                <div className="bg-canvas/35 px-3 py-2.5">
                  <p className="text-[0.5rem] text-muted">本人拠出</p>
                  <p className="mt-1 text-[0.7rem] font-bold text-ink tabular">
                    {formatYen(summary.monthlyContribution)}
                  </p>
                </div>
                <div className="bg-canvas/35 px-3 py-2.5">
                  <p className="text-[0.5rem] text-muted">会社拠出</p>
                  <p className="mt-1 text-[0.7rem] font-bold text-ink tabular">
                    {formatYen(summary.employerContribution)}
                  </p>
                </div>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[0.56rem] text-muted">
                <CalendarClock className="size-3" />
                基準日 {summary.valuedAt ? formatDateJa(summary.valuedAt) : '未設定'}
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[0.62rem] font-bold text-ink">商品配分</p>
                <p
                  className={
                    summary.isAllocationComplete
                      ? 'text-[0.56rem] font-semibold text-positive tabular'
                      : 'text-[0.56rem] font-semibold text-muted tabular'
                  }
                >
                  合計 {formatPercent(summary.allocationTotal / 100, 1)}
                </p>
              </div>
              {summary.allocations.length === 0 ? (
                <p className="mt-2 rounded-xl border border-line/70 bg-canvas/30 px-3 py-2.5 text-[0.58rem] text-muted">
                  配分は未設定です。編集から商品ごとの比率を登録できます。
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {summary.allocations.map((allocation, index) => (
                    <div key={allocation.id}>
                      <div className="flex items-center justify-between gap-2 text-[0.6rem]">
                        <span className="truncate text-ink">
                          {allocation.label}
                        </span>
                        <span className="shrink-0 font-semibold text-muted tabular">
                          {formatPercent(allocation.ratio / 100, 1)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/60">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, allocation.ratio),
                            )}%`,
                            backgroundColor:
                              ALLOCATION_COLORS[
                                index % ALLOCATION_COLORS.length
                              ],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {account.notes ? (
                <p className="mt-3 text-[0.58rem] leading-relaxed text-muted">
                  {account.notes}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        size="lg"
        title="確定拠出年金を編集"
        description="JIS&Tの評価額・累計拠出額・商品配分を記録します。保存すると、最新の月次記録の確定拠出年金も同じ評価額に更新されます。"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" form="retirement-form" disabled={pending}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {pending ? '保存中…' : '保存する'}
            </Button>
          </>
        }
      >
        <form id="retirement-form" onSubmit={handleSubmit} className="space-y-5">
          <FieldGrid>
            <Field label="制度名" htmlFor="retirement-provider">
              <Input
                id="retirement-provider"
                value={form.provider}
                onChange={(event) => update('provider', event.target.value)}
                maxLength={80}
                required
              />
            </Field>
            <Field label="プラン名" htmlFor="retirement-scheme">
              <Input
                id="retirement-scheme"
                value={form.schemeName}
                onChange={(event) => update('schemeName', event.target.value)}
                maxLength={120}
                required
              />
            </Field>
          </FieldGrid>

          <FieldGrid>
            <Field
              label="評価額"
              htmlFor="retirement-balance"
              hint="JIS&Tの現在の評価額。"
            >
              <MoneyInput
                id="retirement-balance"
                value={form.balance}
                onChange={(event) => update('balance', event.target.value)}
                placeholder="0"
              />
            </Field>
            <Field
              label="累計拠出額"
              htmlFor="retirement-total"
              hint="本人と会社の拠出額の合計。評価損益の計算に使います。"
            >
              <MoneyInput
                id="retirement-total"
                value={form.totalContributed}
                onChange={(event) =>
                  update('totalContributed', event.target.value)
                }
                placeholder="0"
              />
            </Field>
            <Field label="本人の月額拠出" htmlFor="retirement-monthly">
              <MoneyInput
                id="retirement-monthly"
                value={form.monthlyContribution}
                onChange={(event) =>
                  update('monthlyContribution', event.target.value)
                }
                placeholder="0"
              />
            </Field>
            <Field label="会社の月額拠出" htmlFor="retirement-employer">
              <MoneyInput
                id="retirement-employer"
                value={form.employerContribution}
                onChange={(event) =>
                  update('employerContribution', event.target.value)
                }
                placeholder="0"
              />
            </Field>
            <Field label="基準日" htmlFor="retirement-valued-at">
              <Input
                id="retirement-valued-at"
                type="date"
                value={form.valuedAt}
                onChange={(event) => update('valuedAt', event.target.value)}
                required
              />
            </Field>
          </FieldGrid>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-[0.66rem] font-bold text-ink">商品配分</p>
                <p className="mt-0.5 text-[0.54rem] text-muted">
                  評価額に対する比率を入力します。合計100%以下で構いません。
                </p>
              </div>
              <p
                className={
                  ratioTotal > 100.01
                    ? 'text-[0.6rem] font-bold text-danger tabular'
                    : 'text-[0.6rem] font-bold text-muted tabular'
                }
              >
                合計 {formatNumber(ratioTotal)}%
              </p>
            </div>
            <div className="space-y-2">
              {form.allocations.map((allocation, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={allocation.label}
                    onChange={(event) =>
                      updateAllocation(index, 'label', event.target.value)
                    }
                    placeholder="商品名（例: 外国株式）"
                    maxLength={60}
                    className="flex-1"
                    aria-label={`配分${index + 1}の商品名`}
                  />
                  <div className="relative w-24 shrink-0">
                    <Input
                      value={allocation.ratio}
                      onChange={(event) =>
                        updateAllocation(index, 'ratio', event.target.value)
                      }
                      inputMode="decimal"
                      placeholder="0"
                      className="pr-6 text-right tabular"
                      aria-label={`配分${index + 1}の比率`}
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.6rem] text-muted">
                      %
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`配分${index + 1}を削除`}
                    className="shrink-0 text-muted hover:text-danger"
                    onClick={() => removeAllocation(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={addAllocation}
            >
              <Plus className="size-3.5" />
              配分を追加
            </Button>
          </div>

          <Field label="メモ" htmlFor="retirement-notes">
            <Textarea
              id="retirement-notes"
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
              maxLength={1000}
              placeholder="運用方針、見直し予定など"
            />
          </Field>

          {error ? (
            <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.68rem] text-danger">
              {error}
            </p>
          ) : null}
        </form>
      </Dialog>
    </Card>
  )
}
