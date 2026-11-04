import { useRouter } from '@tanstack/react-router'
import { Footprints, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { StepRecord } from '../../db/schema'
import {
  addYears,
  formatDateJa,
  formatDateTimeJa,
  parseDateOnly,
  toDateOnlyString,
} from '../../lib/format'
import {
  buildStepPoints,
  formatCompactSteps,
  formatDistance,
  formatSteps,
  sumSteps,
  type StepSeries,
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

export function HealthCapitalPanel({
  records,
  lastStepSyncedAt,
  strideCm,
  today,
  range,
}: {
  records: StepRecord[]
  lastStepSyncedAt?: string | null
  strideCm: number
  today: string
  range: '12m' | 'all'
}) {
  const router = useRouter()
  const [series, setSeries] = useState<StepSeries>('cumulative')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState<StepRecord | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const periodStart =
    range === '12m'
      ? toDateOnlyString(addYears(parseDateOnly(today), -1))
      : null
  const periodRecords = periodStart
    ? records.filter((record) => record.date >= periodStart)
    : records

  const totalSteps = sumSteps(records)
  const periodSteps = sumSteps(periodRecords)
  const averageSteps =
    periodRecords.length > 0 ? Math.round(periodSteps / periodRecords.length) : 0
  // 累積は全期間で積み上げた値を保ち、表示だけを期間で切り出す
  const points = buildStepPoints(records).filter(
    (point) => !periodStart || point.date >= periodStart,
  )
  const recent = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_LIMIT)

  const valueKey = series === 'cumulative' ? 'cumulative' : 'steps'
  const seriesLabel = series === 'cumulative' ? '累積歩数' : '日別歩数'
  const totalDistance = formatDistance(totalSteps, strideCm)
  const periodDistance = formatDistance(periodSteps, strideCm)

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
          description="日付と歩数を記録すると、累積と日別の歩数がここに表示されます。"
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
                <p className="text-[0.56rem] text-muted">累計歩数</p>
                <p className="mt-1 text-[0.8rem] font-semibold tabular text-ink">
                  {formatSteps(totalSteps)}
                </p>
                {totalDistance ? (
                  <p className="mt-0.5 text-[0.54rem] text-muted">
                    概算 {totalDistance}
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl border border-line/70 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.56rem] text-muted">
                  {range === '12m' ? '12ヶ月の合計' : '期間の合計'}
                </p>
                <p className="mt-1 text-[0.8rem] font-semibold tabular text-ink">
                  {formatSteps(periodSteps)}
                </p>
                {periodDistance ? (
                  <p className="mt-0.5 text-[0.54rem] text-muted">
                    概算 {periodDistance}
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl border border-line/70 bg-canvas/35 px-3 py-2.5">
                <p className="text-[0.56rem] text-muted">記録日数</p>
                <p className="mt-1 text-[0.8rem] font-semibold tabular text-ink">
                  {periodRecords.length}日
                </p>
                <p className="mt-0.5 text-[0.54rem] text-muted">
                  1日平均 {formatSteps(averageSteps)}
                </p>
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
              {seriesLabel}
            </span>
            <Segmented
              ariaLabel="歩数の表示"
              value={series}
              onChange={setSeries}
              options={[
                { value: 'cumulative', label: '累積' },
                { value: 'daily', label: '日別' },
              ]}
            />
          </div>

          {points.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-canvas/35 px-4 py-6 text-center text-[0.68rem] text-muted">
              この期間の記録はありません。
            </p>
          ) : (
            <ClientChart height={252} className="-ml-2 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={points}
                  margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="stepFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2f7d5c" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#2f7d5c" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
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
                    interval="preserveStartEnd"
                    tickMargin={10}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={58}
                    tick={{ fontSize: 9.5, fill: 'var(--muted)' }}
                    tickFormatter={(value: number) => formatCompactSteps(value)}
                  />
                  <Tooltip
                    content={(props) => <StepTooltip {...props} />}
                    cursor={{ stroke: 'var(--line-strong)', strokeDasharray: '3 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey={valueKey}
                    name={seriesLabel}
                    stroke="#2f7d5c"
                    strokeWidth={2.2}
                    fill="url(#stepFill)"
                    activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                  />
                </ComposedChart>
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
