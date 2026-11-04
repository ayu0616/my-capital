import { useRouter } from '@tanstack/react-router'
import { Footprints, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { StepRecord } from '../../db/schema'
import {
  formatDateJa,
  formatDateTimeJa,
  formatSignedPercent,
} from '../../lib/format'
import {
  aggregateSteps,
  buildStepSummary,
  formatCompactSteps,
  formatDistance,
  formatSteps,
  type StepBucket,
  type StepGranularity,
} from '../../lib/steps'
import { deleteStepRecord } from '../../server/actions'
import { ClientChart } from '../charts/client-chart'
import { StepTooltip } from '../charts/tooltip'
import { Button } from '../ui/button'
import { ConfirmDialog } from '../ui/dialog'
import { EmptyState } from '../ui/empty-state'
import { Segmented } from '../ui/page'
import { StepDialog } from './step-dialog'

const RECENT_LIMIT = 6

const GRANULARITY_COPY: Record<
  StepGranularity,
  { totalHeading: string; comparisonHeading: string }
> = {
  daily: { totalHeading: '直近30日の合計', comparisonHeading: '前30日比' },
  monthly: { totalHeading: '今月の合計', comparisonHeading: '前月比' },
  yearly: { totalHeading: '今年の合計', comparisonHeading: '前年比' },
}

export function HealthCapitalPanel({
  records,
  lastStepSyncedAt,
  strideCm,
  today,
}: {
  records: StepRecord[]
  lastStepSyncedAt?: string | null
  strideCm: number
  today: string
}) {
  const router = useRouter()
  const [granularity, setGranularity] = useState<StepGranularity>('monthly')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState<StepRecord | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const buckets = aggregateSteps(records, granularity, today)
  const summary = buildStepSummary(records, granularity, today)
  const copy = GRANULARITY_COPY[granularity]
  const distance = formatDistance(summary.total, strideCm)
  const hasSteps = buckets.some((bucket) => bucket.steps > 0)
  const changeTone =
    summary.changeRatio === null
      ? 'text-muted'
      : summary.changeRatio > 0
        ? 'text-positive'
        : summary.changeRatio < 0
          ? 'text-danger'
          : 'text-ink'

  const recent = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_LIMIT)

  async function confirmDelete() {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteStepRecord({ data: { id: deleting.id } })
      toast.success('歩行記録を削除しました')
      setDeleting(null)
      await router.invalidate()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '削除に失敗しました')
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <>
      {records.length === 0 ? (
        <EmptyState
          icon={Footprints}
          title="歩行記録がありません"
          description="日付と歩数を記録すると、期間ごとの歩数がここに表示されます。"
          className="flex-1"
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3.5" />
              記録する
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-line/70 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.56rem] text-muted">{copy.totalHeading}</p>
                <p className="mt-1 text-[0.8rem] font-semibold tabular text-ink">
                  {formatSteps(summary.total)}
                </p>
                {distance ? (
                  <p className="mt-0.5 text-[0.54rem] text-muted">
                    概算 {distance}
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl border border-line/70 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.56rem] text-muted">1日平均</p>
                <p className="mt-1 text-[0.8rem] font-semibold tabular text-ink">
                  {formatSteps(summary.average)}
                </p>
                <p className="mt-0.5 text-[0.54rem] text-muted">
                  記録日数 {summary.recordedDays}日
                </p>
              </div>
              <div className="rounded-xl border border-line/70 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.56rem] text-muted">
                  {copy.comparisonHeading}
                </p>
                {summary.changeRatio === null ? (
                  <>
                    <p className="mt-1 text-[0.8rem] font-semibold text-muted">
                      比較データなし
                    </p>
                    <p className="mt-0.5 text-[0.54rem] text-muted">
                      前期間の記録がありません
                    </p>
                  </>
                ) : (
                  <>
                    <p
                      className={`mt-1 text-[0.8rem] font-semibold tabular ${changeTone}`}
                    >
                      {formatSignedPercent(summary.changeRatio)}
                    </p>
                    <p className="mt-0.5 text-[0.54rem] text-muted">
                      前期間 {formatSteps(summary.previousTotal)}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="size-3.5" />
                記録する
              </Button>
              {lastStepSyncedAt ? (
                <p className="text-[0.54rem] text-muted">
                  最終同期 {formatDateTimeJa(lastStepSyncedAt)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[0.65rem] font-medium text-muted">
              <span className="size-1.5 rounded-full bg-positive" />
              歩数
            </span>
            <Segmented
              ariaLabel="歩数の集計単位"
              value={granularity}
              onChange={setGranularity}
              options={[
                { value: 'daily', label: '日別' },
                { value: 'monthly', label: '月別' },
                { value: 'yearly', label: '年別' },
              ]}
            />
          </div>

          {!hasSteps ? (
            <p className="mt-4 flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-line bg-canvas/35 px-4 py-6 text-center text-[0.68rem] text-muted">
              この期間の記録はありません。
            </p>
          ) : (
            <ClientChart height={252} className="-ml-2 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={buckets}
                  margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--line)"
                    strokeDasharray="2 7"
                  />
                  <XAxis
                    dataKey="shortLabel"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: 'var(--muted)' }}
                    interval={
                      granularity === 'daily' ? 'preserveStartEnd' : 0
                    }
                    tickMargin={10}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={58}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                    tick={{ fontSize: 9.5, fill: 'var(--muted)' }}
                    tickFormatter={(value: number) => formatCompactSteps(value)}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--line)', fillOpacity: 0.35 }}
                    content={(props) => {
                      const bucket = props.payload?.[0]?.payload as
                        | StepBucket
                        | undefined
                      return (
                        <StepTooltip
                          {...props}
                          label={bucket?.label ?? props.label}
                        />
                      )
                    }}
                  />
                  <Bar
                    dataKey="steps"
                    name="歩数"
                    fill="#2f7d5c"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ClientChart>
          )}

          <div className="mt-4 border-t border-line/70 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.62rem] font-semibold text-ink">直近の記録</p>
              <p className="text-[0.56rem] text-muted">全{records.length}件</p>
            </div>
            <ul className="mt-1 divide-y divide-line/70">
              {recent.map((record) => (
                <li key={record.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.68rem] font-semibold text-ink">
                      {formatDateJa(record.date, { withYear: false })}
                    </p>
                    {record.place ? (
                      <p className="truncate text-[0.56rem] text-muted">
                        {record.place}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-[0.7rem] font-semibold tabular text-ink">
                    {formatSteps(record.steps)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${formatDateJa(record.date)}の記録を削除`}
                    className="text-muted hover:text-danger"
                    onClick={() => setDeleting(record)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <StepDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onConfirm={confirmDelete}
        pending={deletePending}
        title="歩行記録を削除しますか？"
        description={
          deleting
            ? `「${formatDateJa(deleting.date)}」の記録（${formatSteps(deleting.steps)}）を削除します。この操作は取り消せません。`
            : ''
        }
      />
    </>
  )
}
