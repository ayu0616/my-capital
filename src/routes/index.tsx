import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { GearPreview } from '../components/dashboard/gear-preview'
import { HoldingCard } from '../components/dashboard/holding-card'
import { HumanCapitalCard } from '../components/dashboard/human-capital-card'
import { LensFundCard } from '../components/dashboard/lens-fund-card'
import { NetWorthHero } from '../components/dashboard/net-worth-hero'
import { NisaCard } from '../components/dashboard/nisa-card'
import { PortfolioCard } from '../components/dashboard/portfolio-card'
import { RecentSnapshots } from '../components/dashboard/recent-snapshots'
import { StockGoalsCard } from '../components/dashboard/stock-goals-card'
import { TrendCard } from '../components/dashboard/trend-card'
import { PageHeader } from '../components/ui/page'
import { buttonVariants } from '../components/ui/button'
import {
  buildCurrentPortfolio,
  buildGearSummary,
  buildHoldingPlan,
  buildHumanCapital,
  buildMonthlySeries,
  buildNetWorthTrend,
  buildNisaPlan,
  buildStockGoalSummaries,
  snapshotTotal,
} from '../lib/finance'
import { formatYearMonth, parseDateOnly } from '../lib/format'
import { getDashboardData } from '../server/queries'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: 'ダッシュボード | Asset & Life Studio' }],
  }),
  loader: () => getDashboardData(),
  component: Dashboard,
})

function Dashboard() {
  const data = Route.useLoaderData()
  const {
    settings,
    holding,
    withdrawals,
    snapshots,
    gears,
    investments,
    careerEvents,
    stockGoals,
  } = data
  const today = parseDateOnly(data.today)
  const latest = snapshots.at(-1) ?? null
  const previous = snapshots.at(-2) ?? null
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
  )
  const previousTotal = previous ? snapshotTotal(previous) : null
  const trend = buildNetWorthTrend(portfolio.total, previousTotal)
  const nisa = buildNisaPlan(settings, latest?.nisaContributedPrincipal ?? 0, today)
  const holdingPlan = buildHoldingPlan(holding, today, withdrawals)
  const humanCapital = buildHumanCapital(investments, careerEvents)
  const series = buildMonthlySeries(snapshots)
  const stockGoalSummaries = buildStockGoalSummaries(stockGoals, today)

  return (
    <>
      <PageHeader
        kicker={`Overview${latest ? ` · ${formatYearMonth(latest.yearMonth)}` : ''}`}
        title={<span>{settings.nickname}さんの資産状況</span>}
        description="金融資産・持株会・機材・自己投資の現在の状況をまとめています。"
        actions={
          <>
            <Link to="/assets" className={buttonVariants({ size: 'md' })}>
              <Plus className="size-3.5" />
              今月を記録
            </Link>
            <Link
              to="/settings"
              className={buttonVariants({ variant: 'outline', size: 'md' })}
              aria-label="設定を開く"
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">設定</span>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <NetWorthHero
          className="lg:col-span-7"
          portfolio={portfolio}
          trend={trend}
          series={series.map((point) => point.total)}
          yearMonth={latest?.yearMonth ?? null}
        />
        <NisaCard className="lg:col-span-5" plan={nisa} />

        <TrendCard className="lg:col-span-7" series={series} />
        <PortfolioCard className="lg:col-span-5" portfolio={portfolio} />

        <HoldingCard className="lg:col-span-5" plan={holdingPlan} />
        <LensFundCard className="lg:col-span-3" settings={settings} />
        <HumanCapitalCard className="lg:col-span-4" summary={humanCapital} />

        {stockGoalSummaries.length > 0 ? (
          <StockGoalsCard
            className="lg:col-span-12"
            summaries={stockGoalSummaries}
          />
        ) : null}

        <GearPreview className="lg:col-span-8" gears={gears} summary={gearSummary} />
        <RecentSnapshots className="lg:col-span-4" snapshots={snapshots} />
      </div>
    </>
  )
}
