import { PieChart as PieIcon, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Portfolio } from '../../lib/finance'
import { formatCompactYen, formatPercent, formatYen } from '../../lib/format'
import { cn } from '../../lib/utils'
import { ClientChart } from '../charts/client-chart'
import { PortfolioTooltip } from '../charts/tooltip'
import { Card, CardContent, CardHeader, CardKicker, CardTitle } from '../ui/card'
import { EmptyState } from '../ui/empty-state'
import { Badge } from '../ui/form'

export function PortfolioCard({
  portfolio,
  className,
}: {
  portfolio: Portfolio
  className?: string
}) {
  const visibleSlices = portfolio.slices.filter((slice) => slice.amount > 0)
  const over = portfolio.isFujitsuOverLimit

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Allocation</CardKicker>
          <CardTitle className="mt-1.5">純資産の内訳</CardTitle>
        </div>
        <Badge variant={over ? 'danger' : 'success'} className="gap-1">
          {over ? <ShieldAlert className="size-3" /> : <ShieldCheck className="size-3" />}
          {over ? '富士通が上限超過' : '安全圏'}
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-1">
        {portfolio.total <= 0 ? (
          <EmptyState
            icon={PieIcon}
            title="内訳はまだありません"
            description="資産スナップショットを記録すると、ポートフォリオが描かれます。"
            className="flex-1"
          />
        ) : (
          <>
            <div className="relative mx-auto w-full max-w-[16rem]">
              <ClientChart height={190} className="mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={visibleSlices}
                      dataKey="amount"
                      nameKey="label"
                      innerRadius={61}
                      outerRadius={85}
                      paddingAngle={2.4}
                      cornerRadius={4}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {visibleSlices.map((slice) => (
                        <Cell key={slice.key} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip content={(props) => <PortfolioTooltip {...props} />} />
                  </PieChart>
                </ResponsiveContainer>
              </ClientChart>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-1">
                <p className="text-[0.55rem] font-bold tracking-[0.16em] text-muted">
                  TOTAL
                </p>
                <p className="mt-1 font-display text-[1.25rem] font-semibold text-ink tabular">
                  {formatCompactYen(portfolio.total)}
                </p>
                <p className="mt-0.5 text-[0.55rem] text-muted">
                  {visibleSlices.length} アセット
                </p>
              </div>
            </div>

            <div className="mt-1 space-y-2">
              {portfolio.slices.map((slice) => (
                <div key={slice.key} className="flex items-center gap-2.5">
                  <span
                    className="size-2 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[0.68rem] text-ink-soft">
                    {slice.label}
                  </span>
                  <span className="text-[0.62rem] font-medium text-muted tabular">
                    {formatPercent(slice.ratio)}
                  </span>
                  <span className="w-[4.8rem] text-right text-[0.66rem] font-semibold text-ink tabular">
                    {formatYen(slice.amount, {})}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-auto border-t border-line/70 pt-3 text-[0.58rem] leading-relaxed text-muted">
              富士通（持株会＋ロマン枠）比率{' '}
              <span className={cn('font-semibold', over ? 'text-danger' : 'text-ink')}>
                {formatPercent(portfolio.fujitsuRatio)}
              </span>{' '}
              / 安全弁 {formatPercent(portfolio.threshold, 0)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
