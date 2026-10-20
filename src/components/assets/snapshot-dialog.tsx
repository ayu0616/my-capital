import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, CalendarPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type {
  AssetSnapshot,
  HoldingStockStatus,
} from '../../db/schema'
import {
  currentYearMonth,
  formatYen,
  formatYearMonth,
} from '../../lib/format'
import { parseNumberInput, parseYenInput } from '../../lib/utils'
import { saveSnapshot } from '../../server/actions'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Field, FieldGrid, Input, MoneyInput, Textarea } from '../ui/form'

type SnapshotFormValues = {
  yearMonth: string
  cashAmount: string
  nisaOrkanAmount: string
  nisaSp500Amount: string
  nisaContributedPrincipal: string
  fujitsuRomanStockShares: string
  holdingStockShares: string
  fujitsuCurrentPrice: string
  gearResaleAmount: string
  notes: string
}

function valuesFromSnapshot(snapshot: AssetSnapshot): SnapshotFormValues {
  return {
    yearMonth: snapshot.yearMonth,
    cashAmount: String(snapshot.cashAmount),
    nisaOrkanAmount: String(snapshot.nisaOrkanAmount),
    nisaSp500Amount: String(snapshot.nisaSp500Amount),
    nisaContributedPrincipal: String(snapshot.nisaContributedPrincipal),
    fujitsuRomanStockShares: String(snapshot.fujitsuRomanStockShares),
    holdingStockShares: String(snapshot.holdingStockShares),
    fujitsuCurrentPrice: String(snapshot.fujitsuCurrentPrice),
    gearResaleAmount: String(snapshot.gearResaleAmount),
    notes: snapshot.notes ?? '',
  }
}

function newValues(
  latest: AssetSnapshot | null,
  holding: HoldingStockStatus,
  gearResaleTotal: number,
  yearMonth: string,
): SnapshotFormValues {
  return {
    yearMonth,
    cashAmount: latest ? String(latest.cashAmount) : '',
    nisaOrkanAmount: latest ? String(latest.nisaOrkanAmount) : '',
    nisaSp500Amount: latest ? String(latest.nisaSp500Amount) : '',
    nisaContributedPrincipal: latest
      ? String(latest.nisaContributedPrincipal)
      : '',
    fujitsuRomanStockShares: latest
      ? String(latest.fujitsuRomanStockShares)
      : '0',
    holdingStockShares: String(holding.currentAccumulatedShares || 0),
    fujitsuCurrentPrice: String(holding.latestStockPrice || 0),
    gearResaleAmount: String(gearResaleTotal || 0),
    notes: '',
  }
}

export function SnapshotDialog({
  open,
  onOpenChange,
  snapshot,
  snapshots,
  latest,
  holding,
  gearResaleTotal,
  defaultYearMonth = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  snapshot: AssetSnapshot | null
  snapshots: AssetSnapshot[]
  latest: AssetSnapshot | null
  holding: HoldingStockStatus
  gearResaleTotal: number
  /** null = current month, '' = blank month picker, or a YYYY-MM value. */
  defaultYearMonth?: string | null
}) {
  const router = useRouter()
  const [form, setForm] = useState<SnapshotFormValues>(() =>
    newValues(
      latest,
      holding,
      gearResaleTotal,
      defaultYearMonth ?? currentYearMonth(),
    ),
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(
      snapshot
        ? valuesFromSnapshot(snapshot)
        : newValues(
            latest,
            holding,
            gearResaleTotal,
            defaultYearMonth ?? currentYearMonth(),
          ),
    )
    setError(null)
  }, [open, snapshot, latest, holding, gearResaleTotal, defaultYearMonth])

  const duplicate = snapshots.some(
    (item) =>
      item.yearMonth === form.yearMonth && item.id !== snapshot?.id,
  )
  const isBlankNew = !snapshot && defaultYearMonth === ''

  const previewTotal = useMemo(() => {
    const cash = parseYenInput(form.cashAmount)
    const orkan = parseYenInput(form.nisaOrkanAmount)
    const sp500 = parseYenInput(form.nisaSp500Amount)
    const shares =
      parseNumberInput(form.fujitsuRomanStockShares) +
      parseNumberInput(form.holdingStockShares)
    const price = parseNumberInput(form.fujitsuCurrentPrice)
    const gear = parseYenInput(form.gearResaleAmount)
    return cash + orkan + sp500 + shares * price + gear
  }, [form])

  function update<K extends keyof SnapshotFormValues>(
    key: K,
    value: SnapshotFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (duplicate) {
      setError('この年月にはすでに記録があります。一覧から編集してください。')
      return
    }
    setPending(true)
    setError(null)
    try {
      await saveSnapshot({
        data: {
          id: snapshot?.id,
          yearMonth: form.yearMonth,
          cashAmount: parseYenInput(form.cashAmount),
          nisaOrkanAmount: parseYenInput(form.nisaOrkanAmount),
          nisaSp500Amount: parseYenInput(form.nisaSp500Amount),
          nisaContributedPrincipal: parseYenInput(
            form.nisaContributedPrincipal,
          ),
          fujitsuRomanStockShares: parseNumberInput(
            form.fujitsuRomanStockShares,
          ),
          holdingStockShares: parseNumberInput(form.holdingStockShares),
          fujitsuCurrentPrice: parseNumberInput(form.fujitsuCurrentPrice),
          gearResaleAmount: parseYenInput(form.gearResaleAmount),
          notes: form.notes.trim() || null,
        },
      })
      toast.success(
        snapshot ? 'スナップショットを更新しました' : 'スナップショットを記録しました',
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
      size="lg"
      title={
        snapshot
          ? 'スナップショットを編集'
          : isBlankNew
            ? '月を追加'
            : '今月の資産を記録'
      }
      description={
        snapshot
          ? `${formatYearMonth(snapshot.yearMonth)} の記録を更新します。`
          : isBlankNew
            ? '記録する年月を選んでください。金額は最新月の値を初期値にしています。'
            : '月末の評価額を入力すると、純資産とポートフォリオに反映されます。'
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            type="submit"
            form="snapshot-form"
            disabled={pending || duplicate || !form.yearMonth}
          >
            {pending ? '保存中…' : snapshot ? '更新する' : '記録する'}
          </Button>
        </>
      }
    >
      <form id="snapshot-form" onSubmit={handleSubmit} className="space-y-6">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <CalendarPlus className="size-3.5 text-brand" />
            <h3 className="text-[0.72rem] font-bold tracking-wide text-ink">
              基準月
            </h3>
          </div>
          <FieldGrid>
            <Field
              label="年月"
              htmlFor="snap-month"
              hint={
                snapshot
                  ? '編集時は年月を変更できません。'
                  : isBlankNew
                    ? 'まだ記録していない月を選んでください。'
                    : '同じ年月は1件だけ記録できます。'
              }
            >
              <Input
                id="snap-month"
                type="month"
                value={form.yearMonth}
                onChange={(event) => update('yearMonth', event.target.value)}
                disabled={Boolean(snapshot)}
              />
            </Field>
            <Field
              label="富士通 株価"
              htmlFor="snap-fujitsu-price"
              hint="持株会とロマン枠の評価に使います。"
            >
              <MoneyInput
                id="snap-fujitsu-price"
                inputMode="decimal"
                value={form.fujitsuCurrentPrice}
                onChange={(event) =>
                  update('fujitsuCurrentPrice', event.target.value)
                }
              />
            </Field>
          </FieldGrid>
          {duplicate ? (
            <p className="mt-2 flex items-center gap-1.5 text-[0.68rem] font-medium text-danger">
              <AlertTriangle className="size-3.5" />
              この年月は記録済みです。一覧から編集してください。
            </p>
          ) : null}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-3 w-0.5 rounded-full bg-brand" />
            <h3 className="text-[0.72rem] font-bold tracking-wide text-ink">
              金融資産
            </h3>
          </div>
          <FieldGrid>
            <Field label="現預金" htmlFor="snap-cash">
              <MoneyInput
                id="snap-cash"
                value={form.cashAmount}
                onChange={(event) => update('cashAmount', event.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="NISA累計元本" htmlFor="snap-principal" hint="1,800万円の進捗に使う簿価ベースの金額。">
              <MoneyInput
                id="snap-principal"
                value={form.nisaContributedPrincipal}
                onChange={(event) =>
                  update('nisaContributedPrincipal', event.target.value)
                }
                placeholder="0"
              />
            </Field>
            <Field label="オルカン評価額" htmlFor="snap-orkan">
              <MoneyInput
                id="snap-orkan"
                value={form.nisaOrkanAmount}
                onChange={(event) =>
                  update('nisaOrkanAmount', event.target.value)
                }
                placeholder="0"
              />
            </Field>
            <Field label="S&P 500 評価額" htmlFor="snap-sp500">
              <MoneyInput
                id="snap-sp500"
                value={form.nisaSp500Amount}
                onChange={(event) =>
                  update('nisaSp500Amount', event.target.value)
                }
                placeholder="0"
              />
            </Field>
          </FieldGrid>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-3 w-0.5 rounded-full bg-gold" />
            <h3 className="text-[0.72rem] font-bold tracking-wide text-ink">
              富士通・持株会
            </h3>
          </div>
          <FieldGrid>
            <Field label="NISAロマン枠 株数" htmlFor="snap-roman-shares">
              <Input
                id="snap-roman-shares"
                inputMode="decimal"
                value={form.fujitsuRomanStockShares}
                onChange={(event) =>
                  update('fujitsuRomanStockShares', event.target.value)
                }
              />
            </Field>
            <Field
              label="持株会の株数"
              htmlFor="snap-holding-shares"
              hint="設定の現在株数が初期値です。"
            >
              <Input
                id="snap-holding-shares"
                inputMode="decimal"
                value={form.holdingStockShares}
                onChange={(event) =>
                  update('holdingStockShares', event.target.value)
                }
              />
            </Field>
          </FieldGrid>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-3 w-0.5 rounded-full bg-[#7a6550]" />
            <h3 className="text-[0.72rem] font-bold tracking-wide text-ink">
              実物資産
            </h3>
          </div>
          <FieldGrid>
            <Field
              label="機材の残存価値"
              htmlFor="snap-gear"
              hint="機材台帳の現在価値の合計が初期値です。"
            >
              <MoneyInput
                id="snap-gear"
                value={form.gearResaleAmount}
                onChange={(event) =>
                  update('gearResaleAmount', event.target.value)
                }
                placeholder="0"
              />
            </Field>
            <div className="rounded-xl border border-brand/10 bg-brand-soft/60 px-3.5 py-2.5">
              <p className="text-[0.56rem] text-brand-ink/60">この記録の純資産</p>
              <p className="mt-1 font-display text-[1.15rem] font-semibold text-brand-ink tabular">
                {formatYen(previewTotal)}
              </p>
            </div>
          </FieldGrid>
        </section>

        <Field label="メモ" htmlFor="snap-notes">
          <Textarea
            id="snap-notes"
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
            placeholder="例: ボーナスから現金を厚めに。積立設定を変更した など"
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
