import { ArrowUpRight, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCompactYen, formatSignedPercent, formatYen } from '../../lib/format'
import type { MonthlyPoint } from '../../lib/finance'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardKicker, CardTitle } from '../ui/card'
import { EmptyState } from '../ui/empty-state'
import { Segmented } from '../ui/page'
import { ClientChart } from '../charts/client-chart'
import { MoneyTooltip } from '../charts/tooltip'

export function TrendCard({
  series,
  className,
}: {
  series: MonthlyPoint[]
  className?: string
}) {
  const [range, setRange] = useState<'12m' | 'all'>('12m')
  const data = range === '12m' ? series.slice(-12) : series
  const first = data[0]
  const last = data[data.length - 1]
  const growth = first && last ? last.total - first.total : 0
  const growthRatio = first && first.total > 0 ? growth / first.total : null
  const peak = data.length ? Math.max(...data.map((point) => point.total)) : 0

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Net worth trend</CardKicker>
          <CardTitle className="mt-1.5">資産の推移</CardTitle>
        </div>
        <Segmented
          ariaLabel="表示期間"
          value={range}
          onChange={setRange}
          options={[
            { value: '12m', label: '12ヶ月' },
            { value: 'all', label: '全期間' },
          ]}
        />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-2">
        {series.length < 2 ? (
          <EmptyState
            icon={TrendingUp}
            title="まだ推移を描けません"
            description="2ヶ月分以上のスナップショットを記録すると、資産の流れがここに表示されます。"
            className="flex-1"
          />
        ) : (
          <>
            <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
              <div className="flex items-center gap-4 text-[0.65rem] font-medium text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-gold" />
                  真の純資産
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-px w-3 bg-brand" />
                  金融資産
                </span>
              </div>
              <div className="flex items-center gap-1 text-[0.68rem] font-semibold text-positive">
                <ArrowUpRight className="size-3.5" />
                {formatSignedPercent(growthRatio ?? 0)}
                <span className="font-medium text-muted">/ 期間内</span>
              </div>
            </div>

            <ClientChart height={252} className="-ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b3823d" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#b3823d" stopOpacity={0.01} />
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
                    width={54}
                    tick={{ fontSize: 9.5, fill: 'var(--muted)' }}
                    tickFormatter={(value: number) => formatCompactYen(value)}
                  />
                  <Tooltip
                    content={(props) => <MoneyTooltip {...props} />}
                    cursor={{ stroke: 'var(--line-strong)', strokeDasharray: '3 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="真の純資産"
                    stroke="#b3823d"
                    strokeWidth={2.2}
                    fill="url(#netWorthFill)"
                    activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="financial"
                    name="金融資産"
                    stroke="var(--brand)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ClientChart>

            <div className="mt-auto grid grid-cols-2 gap-3 border-t border-line/70 pt-4 text-xs">
              <div>
                <p className="text-[0.62rem] text-muted">期間内の増加</p>
                <p className="mt-1 font-semibold tabular text-ink">
                  {formatYen(growth, { sign: true })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[0.62rem] text-muted">期間内の最高値</p>
                <p className="mt-1 font-semibold tabular text-ink">
                  {formatYen(peak)}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
