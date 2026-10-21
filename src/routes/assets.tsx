import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Pencil,
  Plus,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { NisaCard } from '../components/dashboard/nisa-card'
import { TrendCard } from '../components/dashboard/trend-card'
import { SnapshotDialog } from '../components/assets/snapshot-dialog'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { ConfirmDialog } from '../components/ui/dialog'
import { EmptyState } from '../components/ui/empty-state'
import { Badge } from '../components/ui/form'
import { MetricCard, MetricGrid } from '../components/ui/metric'
import { PageHeader } from '../components/ui/page'
import type { AssetSnapshot } from '../db/schema'
import {
  buildCurrentPortfolio,
  buildGearSummary,
  buildMonthlySeries,
  buildNetWorthTrend,
  buildNisaPlan,
  snapshotTotal,
} from '../lib/finance'
import {
  currentYearMonth,
  formatPercent,
  formatSignedPercent,
  formatYearMonth,
  formatYen,
  parseDateOnly,
} from '../lib/format'
import { getAssetsData } from '../server/queries'
import { deleteSnapshot } from '../server/actions'

export const Route = createFileRoute('/assets')({
  head: () => ({
    meta: [{ title: '資産管理 | Asset & Life Studio' }],
  }),
  loader: () => getAssetsData(),
  component: AssetsPage,
})

function AssetsPage() {
  const { settings, holding, snapshots, gears, today } = Route.useLoaderData()
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AssetSnapshot | null>(null)
  const [newMonth, setNewMonth] = useState<string | null>('')
  const [deleting, setDeleting] = useState<AssetSnapshot | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const latest = snapshots.at(-1) ?? null
  const previous = snapshots.at(-2) ?? null
  const nisa = buildNisaPlan(
    settings,
    latest?.nisaContributedPrincipal ?? 0,
    parseDateOnly(today),
  )
  const series = buildMonthlySeries(snapshots)
  const gearSummary = buildGearSummary(gears)
  const portfolio = buildCurrentPortfolio(
    latest,
    holding,
    gearSummary.resaleTotal,
    settings.fujitsuAlertThreshold,
  )
  const previousTotal = previous ? snapshotTotal(previous) : null
  const trend = buildNetWorthTrend(portfolio.total, previousTotal)

  function openNew(yearMonth: string | null = '') {
    setEditing(null)
    setNewMonth(yearMonth)
    setDialogOpen(true)
  }

  function openEdit(snapshot: AssetSnapshot) {
    setEditing(snapshot)
    setDialogOpen(true)
  }

  function openCurrentMonth() {
    const current = snapshots.find(
      (snapshot) => snapshot.yearMonth === currentYearMonth(),
    )
    if (current) openEdit(current)
    else openNew(null)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteSnapshot({ data: { id: deleting.id } })
      toast.success(`${formatYearMonth(deleting.yearMonth)} の記録を削除しました`)
      setDeleting(null)
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '削除に失敗しました')
    } finally {
      setDeletePending(false)
    }
  }

  const rows = [...snapshots].reverse()

  return (
    <>
      <PageHeader
        kicker="Portfolio ledger"
        title="資産の記録"
        description="毎月の資産額を記録し、純資産とNISAの進捗を確認します。"
        actions={
          <>
            <Button variant="outline" onClick={() => openNew()}>
              <Plus className="size-3.5" />
              月を追加
            </Button>
            <Button onClick={openCurrentMonth}>
              <Wallet className="size-3.5" />
              今月を記録
            </Button>
          </>
        }
      />

      <MetricGrid>
        <MetricCard
          label="純資産（機材込み）"
          value={formatYen(portfolio.total)}
          icon={Wallet}
          hint={latest ? `${formatYearMonth(latest.yearMonth)} 時点` : '記録待ち'}
        />
        <MetricCard
          label="金融資産"
          value={formatYen(portfolio.financialTotal)}
          icon={Landmark}
          tone="ink"
          hint="現預金＋投資信託＋富士通＋繰越金"
        />
        <MetricCard
          label="NISA累計元本"
          value={formatYen(nisa.principal)}
          icon={Target}
          tone="brand"
          badge={<Badge variant="brand">{formatPercent(nisa.progress)}</Badge>}
          hint={`残り ${formatYen(nisa.remaining)} / 目標 ${formatYen(nisa.targetAmount)}`}
        />
        <MetricCard
          label="先月比"
          value={
            trend.delta == null ? '—' : formatYen(trend.delta, { sign: true })
          }
          icon={trend.delta != null && trend.delta < 0 ? ArrowDownRight : ArrowUpRight}
          tone={trend.delta != null && trend.delta < 0 ? 'gold' : 'brand'}
          badge={
            trend.deltaRatio != null ? (
              <Badge variant={trend.deltaRatio >= 0 ? 'success' : 'warning'}>
                {formatSignedPercent(trend.deltaRatio)}
              </Badge>
            ) : undefined
          }
          hint={previous ? `${formatYearMonth(previous.yearMonth)} との比較` : '先月の記録がありません'}
        />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <TrendCard className="lg:col-span-7" series={series} />
        <NisaCard className="lg:col-span-5" plan={nisa} />
      </div>

      <Card className="mt-4">
        <CardHeader className="items-center">
          <div>
            <CardTitle>月次スナップショット</CardTitle>
            <p className="mt-1 text-[0.68rem] text-muted">
              全 {snapshots.length} ヶ月の記録
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => openNew()}>
            <Plus className="size-3.5" />
            新規
          </Button>
        </CardHeader>

        <CardContent className="pt-4">
          {rows.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="スナップショットがありません"
              description="現預金・投資信託・持株会・機材の評価額を1ヶ月分入力すると、月次推移が表示されます。"
              action={<Button onClick={() => openNew(null)}>最初の記録を追加</Button>}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted">
                      <th className="py-2.5 pr-3 font-bold">年月</th>
                      <th className="px-3 py-2.5 text-right font-bold">現預金</th>
                      <th className="px-3 py-2.5 text-right font-bold">投資信託</th>
                      <th className="px-3 py-2.5 text-right font-bold">NISA元本</th>
                      <th className="px-3 py-2.5 text-right font-bold">富士通</th>
                      <th className="px-3 py-2.5 text-right font-bold">機材</th>
                      <th className="px-3 py-2.5 text-right font-bold">純資産</th>
                      <th className="py-2.5 pl-3 text-right font-bold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((snapshot) => {
                      const total = snapshotTotal(snapshot)
                      const fujitsuShares =
                        snapshot.fujitsuRomanStockShares +
                        snapshot.holdingStockShares
                      return (
                        <tr
                          key={snapshot.id}
                          className="group border-b border-line/60 last:border-0 hover:bg-brand-soft/20"
                        >
                          <td className="py-3 pr-3">
                            <p className="text-[0.75rem] font-semibold text-ink">
                              {formatYearMonth(snapshot.yearMonth)}
                            </p>
                            {snapshot.notes ? (
                              <p className="mt-0.5 max-w-[12rem] truncate text-[0.56rem] text-muted">
                                {snapshot.notes}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-right text-[0.7rem] tabular text-muted">
                            {formatYen(snapshot.cashAmount)}
                          </td>
                          <td className="px-3 py-3 text-right text-[0.7rem] tabular text-muted">
                            {formatYen(
                              snapshot.nisaOrkanAmount + snapshot.nisaSp500Amount,
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-[0.7rem] tabular text-muted">
                            {formatYen(snapshot.nisaContributedPrincipal)}
                          </td>
                          <td className="px-3 py-3 text-right text-[0.7rem] tabular text-muted">
                            {fujitsuShares.toFixed(1)}株
                            {snapshot.holdingCarryoverAmount > 0 ? (
                              <span className="mt-0.5 block text-[0.52rem] text-muted/80">
                                繰越 {formatYen(snapshot.holdingCarryoverAmount)}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-right text-[0.7rem] tabular text-muted">
                            {formatYen(snapshot.gearResaleAmount)}
                          </td>
                          <td className="px-3 py-3 text-right text-[0.76rem] font-bold tabular text-ink">
                            {formatYen(total)}
                          </td>
                          <td className="py-3 pl-3">
                            <div className="flex items-center justify-end gap-0.5 opacity-60 transition group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="編集"
                                onClick={() => openEdit(snapshot)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="削除"
                                onClick={() => setDeleting(snapshot)}
                                className="text-muted hover:text-danger"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line/70 md:hidden">
                {rows.map((snapshot) => {
                  const total = snapshotTotal(snapshot)
                  return (
                    <li key={snapshot.id} className="py-3.5 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[0.78rem] font-bold text-ink">
                            {formatYearMonth(snapshot.yearMonth)}
                          </p>
                          <p className="mt-0.5 text-[0.56rem] text-muted">
                            NISA元本 {formatYen(snapshot.nisaContributedPrincipal)}
                          </p>
                        </div>
                        <p className="text-right text-[0.82rem] font-bold tabular text-ink">
                          {formatYen(total)}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[0.56rem] text-muted">
                        <span className="rounded-full bg-canvas/70 px-2 py-0.5">
                          現金 {formatYen(snapshot.cashAmount)}
                        </span>
                        <span className="rounded-full bg-canvas/70 px-2 py-0.5">
                          投資 {formatYen(snapshot.nisaOrkanAmount + snapshot.nisaSp500Amount)}
                        </span>
                        {snapshot.holdingCarryoverAmount > 0 ? (
                          <span className="rounded-full bg-canvas/70 px-2 py-0.5">
                            繰越 {formatYen(snapshot.holdingCarryoverAmount)}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-canvas/70 px-2 py-0.5">
                          機材 {formatYen(snapshot.gearResaleAmount)}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(snapshot)}
                        >
                          <Pencil className="size-3" />
                          編集
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleting(snapshot)}
                          className="text-muted hover:text-danger"
                        >
                          削除
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <SnapshotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        snapshot={editing}
        snapshots={snapshots}
        latest={latest}
        holding={holding}
        gearResaleTotal={gearSummary.resaleTotal}
        defaultYearMonth={newMonth}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onConfirm={confirmDelete}
        pending={deletePending}
        title="スナップショットを削除しますか？"
        description={
          deleting
            ? `${formatYearMonth(deleting.yearMonth)} の記録を削除します。この操作は取り消せません。`
            : ''
        }
      />
    </>
  )
}
