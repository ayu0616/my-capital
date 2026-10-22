import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  CalendarClock,
  Gift,
  Plus,
  Target,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { StockGoalCard } from '../components/stocks/stock-goal-card'
import { StockGoalDialog } from '../components/stocks/stock-goal-dialog'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { ConfirmDialog } from '../components/ui/dialog'
import { EmptyState } from '../components/ui/empty-state'
import { MetricCard, MetricGrid } from '../components/ui/metric'
import { PageHeader } from '../components/ui/page'
import type { StockGoal } from '../db/schema'
import { buildStockGoalSummaries } from '../lib/finance'
import {
  formatDateJa,
  formatNumber,
  formatYen,
  parseDateOnly,
} from '../lib/format'
import { deleteStockGoal } from '../server/actions'
import { getStockGoalsData } from '../server/queries'

export const Route = createFileRoute('/stock-goals')({
  head: () => ({
    meta: [{ title: '優待株 | Asset & Life Studio' }],
  }),
  loader: () => getStockGoalsData(),
  component: StockGoalsPage,
})

function StockGoalsPage() {
  const { goals, today } = Route.useLoaderData()
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<StockGoal | null>(null)
  const [deleting, setDeleting] = useState<StockGoal | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const summaries = buildStockGoalSummaries(goals, parseDateOnly(today))
  const active = summaries.filter((summary) => !summary.isAchieved)
  const achieved = summaries.filter((summary) => summary.isAchieved)
  const nearest = active[0] ?? null
  const requiredBudgetTotal = active.reduce(
    (sum, summary) => sum + (summary.requiredBudgetPerMonth ?? 0),
    0,
  )
  const hasRequiredBudget = active.some(
    (summary) => summary.requiredBudgetPerMonth != null,
  )

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(goal: StockGoal) {
    setEditing(goal)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteStockGoal({ data: { id: deleting.id } })
      toast.success('優待株の目標を削除しました')
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
    <>
      <PageHeader
        kicker="Shareholder benefits"
        title="優待株"
        actions={
          <Button onClick={openNew}>
            <Plus className="size-3.5" />
            目標を追加
          </Button>
        }
      />

      <MetricGrid>
        <MetricCard
          label="進行中の目標"
          value={`${active.length}件`}
          icon={Target}
          tone="brand"
          hint={
            achieved.length > 0
              ? `${achieved.length}件が達成済み`
              : '目標株数と期限を登録'
          }
        />
        <MetricCard
          label="直近の期限"
          value={nearest ? formatDateJa(nearest.targetDate) : '—'}
          icon={CalendarClock}
          tone="gold"
          hint={
            nearest
              ? nearest.daysRemaining < 0
                ? `${Math.abs(nearest.daysRemaining)}日超過`
                : `あと${nearest.daysRemaining}日`
              : '進行中の目標はありません'
          }
        />
        <MetricCard
          label="必要月額の合計"
          value={hasRequiredBudget ? formatYen(requiredBudgetTotal) : '—'}
          icon={Wallet}
          tone="ink"
          hint="現在株価と期限から逆算。手数料・税金は含みません。"
        />
        <MetricCard
          label="残り株数"
          value={`${formatNumber(
            active.reduce((sum, summary) => sum + summary.remainingShares, 0),
            0,
          )}株`}
          icon={Gift}
          tone="muted"
          hint="進行中の目標を合計"
        />
      </MetricGrid>

      <div className="mt-4">
        {summaries.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={Gift}
                title="優待株の目標はまだありません"
                description="JR西日本株を100株集める、など株主優待の目標を登録します。目標株数と期限から、月あたり何株必要かを計算します。"
                action={
                  <Button size="sm" onClick={openNew}>
                    <Plus className="size-3.5" />
                    最初の目標を追加
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {summaries.map((summary) => {
                const goal = goals.find((item) => item.id === summary.id)
                if (!goal) return null
                return (
                  <StockGoalCard
                    key={summary.id}
                    summary={summary}
                    onEdit={() => openEdit(goal)}
                    onDelete={() => setDeleting(goal)}
                  />
                )
              })}
            </div>
            <p className="mt-4 text-[0.6rem] leading-relaxed text-muted">
              現在株数は手入力のほか、楽天証券CSVの取り込み時に銘柄コードで更新できます。優待の条件は変更されることがあるため、購入前に公式情報を確認してください。
            </p>
          </>
        )}
      </div>

      <StockGoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        goal={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onConfirm={confirmDelete}
        pending={deletePending}
        title="優待株の目標を削除しますか？"
        description={
          deleting
            ? `${deleting.name}（${deleting.code || 'コードなし'}）の目標を削除します。保有銘柄の記録は削除されません。`
            : ''
        }
      />
    </>
  )
}
