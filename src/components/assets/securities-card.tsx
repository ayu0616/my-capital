import { useRouter } from '@tanstack/react-router'
import {
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import type {
  SecuritiesHolding,
  SecuritiesImportBatch,
} from '../../db/schema'
import {
  decodeRakutenCsvBuffer,
  parseRakutenCsv,
  type RakutenCsvSummary,
} from '../../lib/rakuten-csv'
import {
  formatDateJa,
  formatNumber,
  formatSignedPercent,
  formatYen,
  toDateOnlyString,
  todayDateOnly,
} from '../../lib/format'
import { importRakutenSecurities } from '../../server/actions'
import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardKicker,
  CardTitle,
} from '../ui/card'
import { Dialog } from '../ui/dialog'
import { EmptyState } from '../ui/empty-state'
import { Badge, Field, Input } from '../ui/form'

const CATEGORY_LABELS: Record<string, string> = {
  stock: '株式',
  fund: '投資信託',
  other: 'その他',
}

export function SecuritiesCard({
  batch,
  holdings,
  className,
}: {
  batch: SecuritiesImportBatch | null
  holdings: SecuritiesHolding[]
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Card className={className}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Rakuten Securities</CardKicker>
          <CardTitle className="mt-1.5">楽天証券の保有銘柄</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Upload className="size-3.5" />
          CSVを取り込む
        </Button>
      </CardHeader>

      <CardContent>
        {!batch ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="まだCSVを取り込んでいません"
            description="楽天証券の「保有商品一覧（すべて）」をCSVで保存し、ここから取り込みます。投資信託・個別株・預り金をまとめて反映できます。"
            action={
              <Button size="sm" onClick={() => setOpen(true)}>
                <Upload className="size-3.5" />
                最初のCSVを取り込む
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.52rem] text-muted">評価額合計</p>
                <p className="mt-1 text-[0.82rem] font-bold text-ink tabular">
                  {formatYen(batch.totalValue)}
                </p>
              </div>
              <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.52rem] text-muted">預り金</p>
                <p className="mt-1 text-[0.82rem] font-bold text-ink tabular">
                  {formatYen(batch.cashValue)}
                </p>
              </div>
              <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.52rem] text-muted">銘柄数</p>
                <p className="mt-1 text-[0.82rem] font-bold text-ink tabular">
                  {batch.holdingCount}件
                </p>
              </div>
              <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.52rem] text-muted">基準日</p>
                <p className="mt-1 text-[0.82rem] font-bold text-ink">
                  {formatDateJa(batch.asOfDate)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.56rem] text-muted">
              <Badge variant="outline">{batch.account}</Badge>
              {batch.fileName ? (
                <span className="truncate">取り込み元: {batch.fileName}</span>
              ) : null}
            </div>

            <div className="mt-4 max-h-[22rem] overflow-auto rounded-xl border border-line/80">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-line text-[0.52rem] font-bold uppercase tracking-[0.1em] text-muted">
                    <th className="px-3 py-2 font-bold">種別</th>
                    <th className="px-3 py-2 font-bold">銘柄</th>
                    <th className="px-3 py-2 font-bold">口座</th>
                    <th className="px-3 py-2 text-right font-bold">数量</th>
                    <th className="px-3 py-2 text-right font-bold">評価額</th>
                    <th className="px-3 py-2 text-right font-bold">評価損益</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr
                      key={holding.id}
                      className="border-b border-line/50 last:border-0"
                    >
                      <td className="px-3 py-2 text-[0.6rem] text-muted">
                        {CATEGORY_LABELS[holding.category] ?? holding.type}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[0.66rem] font-semibold text-ink">
                            {holding.name}
                          </span>
                          {holding.code ? (
                            <span className="text-[0.52rem] text-muted">
                              {holding.code}
                            </span>
                          ) : null}
                          {holding.isFujitsu === 1 ? (
                            <Badge variant="gold" className="text-[0.5rem]">
                              富士通
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[0.56rem] text-muted">
                        {holding.accountType || '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-[0.6rem] tabular text-muted">
                        {formatNumber(holding.quantity, 2)}
                        {holding.unit ? ` ${holding.unit}` : ''}
                      </td>
                      <td className="px-3 py-2 text-right text-[0.64rem] font-semibold tabular text-ink">
                        {formatYen(holding.marketValue)}
                      </td>
                      <td
                        className={
                          holding.profitLoss < 0
                            ? 'px-3 py-2 text-right text-[0.6rem] tabular text-danger'
                            : 'px-3 py-2 text-right text-[0.6rem] tabular text-positive'
                        }
                      >
                        {formatYen(holding.profitLoss, { sign: true })}
                        <span className="ml-1 text-[0.5rem] text-muted">
                          {formatSignedPercent(holding.profitLossPercent)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[0.54rem] leading-relaxed text-muted">
              CSVはブラウザで解析し、保有銘柄と集計値だけを保存します。元のCSVファイルは保存しません。
            </p>
          </>
        )}
      </CardContent>

      <RakutenImportDialog open={open} onOpenChange={setOpen} />
    </Card>
  )
}

function RakutenImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [encoding, setEncoding] = useState<'UTF-8' | 'Shift_JIS'>('UTF-8')
  const [parsed, setParsed] = useState<RakutenCsvSummary | null>(null)
  const [asOfDate, setAsOfDate] = useState(() =>
    toDateOnlyString(todayDateOnly()),
  )
  const [updateNisaPrincipal, setUpdateNisaPrincipal] = useState(false)
  const [updateStockGoals, setUpdateStockGoals] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setFileName('')
    setParsed(null)
    setError(null)
    setUpdateNisaPrincipal(false)
    setUpdateStockGoals(true)
    setAsOfDate(toDateOnlyString(todayDateOnly()))
  }

  function close(next: boolean) {
    if (!next && pending) return
    onOpenChange(next)
    if (!next) reset()
  }

  async function handleFile(file: File) {
    setError(null)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('CSVファイルを選択してください。')
      return
    }
    try {
      const buffer = await file.arrayBuffer()
      const decoded = decodeRakutenCsvBuffer(buffer)
      const summary = parseRakutenCsv(decoded.text)
      setFileName(file.name)
      setEncoding(decoded.encoding)
      setParsed(summary)
      setAsOfDate(toDateOnlyString(todayDateOnly()))
    } catch (cause) {
      setParsed(null)
      setFileName('')
      setError(
        cause instanceof Error
          ? cause.message
          : 'CSVを読み込めませんでした。',
      )
    }
  }

  async function handleImport(event: React.FormEvent) {
    event.preventDefault()
    if (!parsed) {
      setError('CSVを選択してください。')
      return
    }
    setPending(true)
    setError(null)
    try {
      const result = await importRakutenSecurities({
        data: {
          asOfDate,
          fileName,
          cashValue: parsed.cashValue,
          updateNisaPrincipal,
          updateStockGoals,
          holdings: parsed.holdings.map((holding) => ({
            type: holding.type,
            category: holding.category,
            code: holding.code,
            name: holding.name,
            accountType: holding.accountType,
            quantity: holding.quantity,
            unit: holding.unit,
            averagePrice: holding.averagePrice,
            currentPrice: holding.currentPrice,
            marketValue: holding.marketValue,
            profitLoss: holding.profitLoss,
            profitLossPercent: holding.profitLossPercent,
          })),
        },
      })
      toast.success(
        result.updatedGoals > 0
          ? `楽天証券の保有資産を取り込み、優待株${result.updatedGoals}件を更新しました`
          : '楽天証券の保有資産を取り込みました',
      )
      await router.invalidate()
      reset()
      onOpenChange(false)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : '取り込みに失敗しました'
      setError(message)
      toast.error(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title="楽天証券のCSVを取り込む"
      description="楽天証券の「保有商品一覧（すべて）」をCSVで保存して選択してください。"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => close(false)}>
            キャンセル
          </Button>
          <Button
            type="submit"
            form="rakuten-import-form"
            disabled={pending || !parsed}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {pending ? '取り込み中…' : 'この内容を取り込む'}
          </Button>
        </>
      }
    >
      <form id="rakuten-import-form" onSubmit={handleImport} className="space-y-5">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
            event.target.value = ''
          }}
        />

        {!parsed ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/35 px-6 py-10 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const file = event.dataTransfer.files?.[0]
              if (file) void handleFile(file)
            }}
          >
            <span className="mb-3 flex size-11 items-center justify-center rounded-2xl border border-brand/10 bg-brand-soft text-brand">
              <FileSpreadsheet className="size-5" />
            </span>
            <p className="text-sm font-bold text-ink">
              保有商品一覧のCSVを選択
            </p>
            <p className="mt-1.5 max-w-md text-[0.64rem] leading-relaxed text-muted">
              楽天証券にログインし、「保有商品一覧（すべて）」をCSVで保存してください。UTF-8とShift_JISのどちらでも取り込めます。
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-4"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              CSVを選択
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/10 bg-brand-soft/45 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <FileSpreadsheet className="size-4 shrink-0 text-brand" />
                <div className="min-w-0">
                  <p className="truncate text-[0.66rem] font-bold text-ink">
                    {fileName}
                  </p>
                  <p className="text-[0.52rem] text-muted">
                    {encoding} · {parsed.holdingCount}銘柄
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                >
                  <RefreshCw className="size-3.5" />
                  変更
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="選択したCSVを解除"
                  onClick={() => {
                    setParsed(null)
                    setFileName('')
                    setError(null)
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.52rem] text-muted">資産合計</p>
                <p className="mt-1 text-[0.8rem] font-bold text-ink tabular">
                  {formatYen(parsed.totalValue)}
                </p>
              </div>
              <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.52rem] text-muted">保有商品</p>
                <p className="mt-1 text-[0.8rem] font-bold text-ink tabular">
                  {formatYen(parsed.productValue)}
                </p>
              </div>
              <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.52rem] text-muted">預り金</p>
                <p className="mt-1 text-[0.8rem] font-bold text-ink tabular">
                  {formatYen(parsed.cashValue)}
                </p>
              </div>
              <div className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.52rem] text-muted">NISA取得額</p>
                <p className="mt-1 text-[0.8rem] font-bold text-ink tabular">
                  {formatYen(parsed.nisaCostBasis)}
                </p>
              </div>
            </div>

            <div className="max-h-[18rem] overflow-auto rounded-xl border border-line/80">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-line text-[0.52rem] font-bold uppercase tracking-[0.1em] text-muted">
                    <th className="px-3 py-2 font-bold">種別</th>
                    <th className="px-3 py-2 font-bold">銘柄</th>
                    <th className="px-3 py-2 font-bold">口座</th>
                    <th className="px-3 py-2 text-right font-bold">数量</th>
                    <th className="px-3 py-2 text-right font-bold">評価額</th>
                    <th className="px-3 py-2 text-right font-bold">評価損益</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.holdings.map((holding, index) => (
                    <tr
                      key={`${holding.code}-${holding.name}-${holding.accountType}-${index}`}
                      className="border-b border-line/50 last:border-0"
                    >
                      <td className="px-3 py-2 text-[0.6rem] text-muted">
                        {CATEGORY_LABELS[holding.category] ?? holding.type}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[0.66rem] font-semibold text-ink">
                            {holding.name}
                          </span>
                          {holding.code ? (
                            <span className="text-[0.52rem] text-muted">
                              {holding.code}
                            </span>
                          ) : null}
                          {holding.isFujitsu ? (
                            <Badge variant="gold" className="text-[0.5rem]">
                              富士通
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[0.56rem] text-muted">
                        {holding.accountType || '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-[0.6rem] tabular text-muted">
                        {formatNumber(holding.quantity, 2)}
                        {holding.unit ? ` ${holding.unit}` : ''}
                      </td>
                      <td className="px-3 py-2 text-right text-[0.64rem] font-semibold tabular text-ink">
                        {formatYen(holding.marketValue)}
                      </td>
                      <td
                        className={
                          holding.profitLoss < 0
                            ? 'px-3 py-2 text-right text-[0.6rem] tabular text-danger'
                            : 'px-3 py-2 text-right text-[0.6rem] tabular text-positive'
                        }
                      >
                        {formatYen(holding.profitLoss, { sign: true })}
                        <span className="ml-1 text-[0.5rem] text-muted">
                          {formatSignedPercent(holding.profitLossPercent)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="基準日"
                htmlFor="rakuten-as-of"
                hint="この月のスナップショットを作成または更新します。"
              >
                <Input
                  id="rakuten-as-of"
                  type="date"
                  value={asOfDate}
                  onChange={(event) => setAsOfDate(event.target.value)}
                  required
                />
              </Field>
              <div className="flex flex-col justify-center rounded-xl border border-line/80 bg-canvas/35 px-3.5 py-3">
                <label className="flex items-start gap-2.5 text-[0.66rem] font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={updateNisaPrincipal}
                    disabled={parsed.nisaCostBasis <= 0}
                    onChange={(event) =>
                      setUpdateNisaPrincipal(event.target.checked)
                    }
                    className="mt-0.5 size-4 rounded border-line accent-brand"
                  />
                  <span>
                    NISA累計元本をCSVの取得額に合わせる
                    <span className="mt-0.5 block text-[0.54rem] leading-relaxed text-muted">
                      {parsed.nisaCostBasis > 0
                        ? `現在の保有分の取得額は ${formatYen(parsed.nisaCostBasis)} です。通常は変更せず、必要に応じてオンにしてください。`
                        : '口座列がNISAの銘柄がないため、この項目は更新できません。'}
                    </span>
                  </span>
                </label>
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-line/80 bg-canvas/35 px-3.5 py-3">
                <label className="flex items-start gap-2.5 text-[0.66rem] font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={updateStockGoals}
                    onChange={(event) =>
                      setUpdateStockGoals(event.target.checked)
                    }
                    className="mt-0.5 size-4 rounded border-line accent-brand"
                  />
                  <span>
                    優待株の現在株数を更新する
                    <span className="mt-0.5 block text-[0.54rem] leading-relaxed text-muted">
                      銘柄コードが一致する優待株目標を、CSVの保有数量に合わせます。
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-gold/20 bg-gold/8 px-3.5 py-3 text-[0.58rem] leading-relaxed text-gold-strong">
              取り込むと、基準日の月にある投資信託・個別株・その他の証券・証券預り金の値がCSVの内容に置き換わります。銀行の現預金、持株会、機材の値は変更しません。
            </div>
          </>
        )}

        {error ? (
          <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.68rem] text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
