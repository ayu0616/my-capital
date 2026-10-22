import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Pencil,
  Plus,
  Target,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { NisaCard } from '../components/dashboard/nisa-card'
import { TrendCard } from '../components/dashboard/trend-card'
import { SecuritiesCard } from '../components/assets/securities-card'
import { AssetEntryDialog } from '../components/assets/snapshot-dialog'
import { ASSET_ITEM_GROUPS, ASSET_ITEMS, formatAssetEntryValue } from '../lib/asset-items'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card'

import { EmptyState } from '../components/ui/empty-state'
import { Badge } from '../components/ui/form'
import { MetricCard, MetricGrid } from '../components/ui/metric'
import { PageHeader } from '../components/ui/page'
import {
  buildCurrentPortfolio,
  buildGearSummary,
  buildMonthlySeries,
  buildNetWorthTrend,
  buildNisaPlan,
  snapshotTotal,
} from '../lib/finance'
import {
  formatPercent,
  formatSignedPercent,
  formatYearMonth,
  formatYen,
  parseDateOnly,
} from '../lib/format'
import { getAssetsData } from '../server/queries'

export const Route = createFileRoute('/assets')({
  head: () => ({
    meta: [{ title: '資産管理 | Asset & Life Studio' }],
  }),
  loader: () => getAssetsData(),
  component: AssetsPage,
})

function AssetsPage() {
  const {
    settings,
    holding,
    withdrawals,
    snapshots,
    assetEntries,
    gears,
    retirement,
    securities,
    today,
  } = Route.useLoaderData()
  const [allOpen, setAllOpen] = useState(false)
  const [itemOpen, setItemOpen] = useState(false)
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null)

  const latest = snapshots.at(-1) ?? null
  const previous = snapshots.at(-2) ?? null
  const nisa = buildNisaPlan(
    settings,
    latest?.nisaContributedPrincipal ?? 0,
    parseDateOnly(today),
  )
  const series = buildMonthlySeries(snapshots)
  const gearSummary = buildGearSummary(gears)
  const withdrawnShares = withdrawals.reduce(
    (sum, withdrawal) => sum + withdrawal.shares,
    0,
  )
  const portfolio = buildCurrentPortfolio(
    latest,
    holding,
    gearSummary.resaleTotal,
    settings.fujitsuAlertThreshold,
    withdrawnShares,
    retirement.balance,
  )
  const previousTotal = previous ? snapshotTotal(previous) : null
  const trend = buildNetWorthTrend(portfolio.total, previousTotal)

  const activeItem = activeItemKey
    ? ASSET_ITEMS.find((item) => item.key === activeItemKey) ?? null
    : null

  const rows = [...snapshots].reverse()

  return (
    <>
      <PageHeader
        kicker="Portfolio ledger"
        title="資産の記録"
        actions={
          <>
            <Button variant="outline" onClick={() => setAllOpen(true)}>
              <Plus className="size-3.5" />
              まとめて更新
            </Button>
            <Button onClick={() => setAllOpen(true)}>
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
          info="現預金＋証券預り金＋投資信託＋個別株＋JIS&T＋富士通＋引出し済み＋繰越金"
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

      <SecuritiesCard
        batch={securities.batch}
        holdings={securities.holdings}
        className="mt-4"
      />

      <Card className="mt-4">
        <CardHeader className="items-center">
          <div>
            <CardTitle>資産項目の記録</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAllOpen(true)}>
            <Plus className="size-3.5" />
            まとめて更新
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ASSET_ITEM_GROUPS.map((group) => (
              <div key={group} className="space-y-2">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-muted">
                  {group}
                </p>
                <ul className="divide-y divide-line/60 rounded-xl border border-line/60">
                  {ASSET_ITEMS.filter((item) => item.group === group).map((item) => {
                    const entry = assetEntries
                      .filter((row) => row.itemKey === item.key)
                      .sort((a, b) => b.valuedAt.localeCompare(a.valuedAt))[0]
                    return (
                      <li
                        key={item.key}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-[0.72rem] font-semibold text-ink">
                            {item.label}
                          </p>
                          <p className="mt-0.5 text-[0.56rem] text-muted">
                            {entry
                              ? `${entry.valuedAt} 時点`
                              : '未記録'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[0.76rem] font-bold tabular text-ink">
                            {entry
                              ? formatAssetEntryValue(item, entry.value)
                              : '—'}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveItemKey(item.key)
                              setItemOpen(true)
                            }}
                          >
                            <Pencil className="size-3" />
                            更新
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="items-center">
          <div>
            <CardTitle>月次推移（自動集計）</CardTitle>
            <p className="mt-1 text-[0.68rem] text-muted">
              {snapshots.length} ヶ月分
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAllOpen(true)}>
            <Plus className="size-3.5" />
            追加
          </Button>
        </CardHeader>

        <CardContent className="pt-4">
          {rows.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="スナップショットがありません"
              description="現預金・投資信託・持株会・機材の評価額を1ヶ月分入力すると、月次推移が表示されます。"
              action={<Button onClick={() => setAllOpen(true)}>最初の記録を追加</Button>}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1120px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted">
                      <th className="py-2.5 pr-3 font-bold">年月</th>
                      <th className="px-3 py-2.5 text-right font-bold">現預金</th>
                      <th className="px-3 py-2.5 text-right font-bold">証券預り金</th>
                      <th className="px-3 py-2.5 text-right font-bold">投資信託</th>
                      <th className="px-3 py-2.5 text-right font-bold">個別株・他</th>
                      <th className="px-3 py-2.5 text-right font-bold">確定拠出年金</th>
                      <th className="px-3 py-2.5 text-right font-bold">NISA元本</th>
                      <th className="px-3 py-2.5 text-right font-bold">富士通</th>
                      <th className="px-3 py-2.5 text-right font-bold">機材</th>
                      <th className="px-3 py-2.5 text-right font-bold">純資産</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((snapshot) => {
                      const total = snapshotTotal(snapshot)
                      const fujitsuShares =
                        snapshot.fujitsuRomanStockShares +
                        snapshot.holdingStockShares +
                        snapshot.withdrawnHoldingShares
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
                            {formatYen(snapshot.securitiesCashAmount)}
                          </td>
                          <td className="px-3 py-3 text-right text-[0.7rem] tabular text-muted">
                            {formatYen(snapshot.nisaMutualFundAmount)}
                          </td>
                          <td className="px-3 py-3 text-right text-[0.7rem] tabular text-muted">
                            {formatYen(
                              snapshot.nisaIndividualStockAmount +
                                snapshot.nisaOtherAssetAmount,
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-[0.7rem] tabular text-muted">
                            {formatYen(snapshot.pensionBalance)}
                          </td>
                          <td className="px-3 py-3 text-right text-[0.7rem] tabular text-muted">
                            {formatYen(snapshot.nisaContributedPrincipal)}
                          </td>
                          <td className="px-3 py-3 text-right text-[0.7rem] tabular text-muted">
                            {fujitsuShares.toFixed(1)}株
                            {snapshot.withdrawnHoldingShares > 0 ? (
                              <span className="mt-0.5 block text-[0.52rem] text-muted/80">
                                引出し {snapshot.withdrawnHoldingShares.toFixed(1)}株
                              </span>
                            ) : null}
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
                          証券 {formatYen(snapshot.securitiesCashAmount)}
                        </span>
                        <span className="rounded-full bg-canvas/70 px-2 py-0.5">
                          投資{' '}
                          {formatYen(
                            snapshot.nisaMutualFundAmount +
                              snapshot.nisaIndividualStockAmount +
                              snapshot.nisaOtherAssetAmount,
                          )}
                        </span>
                        <span className="rounded-full bg-canvas/70 px-2 py-0.5">
                          JIS&amp;T {formatYen(snapshot.pensionBalance)}
                        </span>
                        {snapshot.withdrawnHoldingShares > 0 ? (
                          <span className="rounded-full bg-canvas/70 px-2 py-0.5">
                            引出し {snapshot.withdrawnHoldingShares.toFixed(1)}株
                          </span>
                        ) : null}
                        {snapshot.holdingCarryoverAmount > 0 ? (
                          <span className="rounded-full bg-canvas/70 px-2 py-0.5">
                            繰越 {formatYen(snapshot.holdingCarryoverAmount)}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-canvas/70 px-2 py-0.5">
                          機材 {formatYen(snapshot.gearResaleAmount)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <AssetEntryDialog
        open={allOpen}
        onOpenChange={setAllOpen}
        items={ASSET_ITEMS}
        entries={assetEntries}
        title="資産をまとめて更新"
      />
      {activeItem ? (
        <AssetEntryDialog
          open={itemOpen}
          onOpenChange={(open) => {
            setItemOpen(open)
            if (!open) setActiveItemKey(null)
          }}
          items={[activeItem]}
          entries={assetEntries}
          title={`${activeItem.label} を更新`}
        />
      ) : null}
    </>
  )
}
