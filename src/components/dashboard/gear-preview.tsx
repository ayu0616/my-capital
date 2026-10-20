import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Camera } from 'lucide-react'
import type { CameraGear } from '../../db/schema'
import type { GearSummary } from '../../lib/finance'
import { gearCategoryLabel } from '../../lib/finance'
import { formatPercent, formatYen } from '../../lib/format'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardKicker, CardTitle } from '../ui/card'
import { EmptyState } from '../ui/empty-state'
import { GearArtwork } from '../gear/gear-artwork'

export function GearPreview({
  gears,
  summary,
  className,
}: {
  gears: CameraGear[]
  summary: GearSummary
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Gear collection</CardKicker>
          <CardTitle className="mt-1.5">機材コレクション</CardTitle>
        </div>
        <Link
          to="/gear"
          className="flex items-center gap-1 text-[0.65rem] font-semibold text-brand hover:text-brand-strong"
        >
          台帳へ
          <ArrowUpRight className="size-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {gears.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="機材を登録しましょう"
            description="レンズやボディの現在価値を記録すると、真の純資産に反映されます。"
            action={
              <Link
                to="/gear"
                className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-[0.72rem] font-semibold text-brand-contrast"
              >
                機材を追加
              </Link>
            }
            className="flex-1"
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {gears.slice(0, 4).map((gear) => (
                <Link key={gear.id} to="/gear" className="group min-w-0">
                  <GearArtwork
                    category={gear.category}
                    imageKey={gear.imageKey}
                    name={gear.name}
                    className="h-[5.4rem] rounded-xl border border-black/10 sm:h-[6.2rem]"
                  />
                  <p className="mt-2 truncate text-[0.68rem] font-semibold text-ink">
                    {gear.name}
                  </p>
                  <p className="mt-0.5 truncate text-[0.55rem] text-muted">
                    {gearCategoryLabel(gear.category)} ·{' '}
                    {formatYen(gear.resaleValue)}
                  </p>
                </Link>
              ))}
            </div>

            <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line/70 pt-4">
              <div>
                <p className="text-[0.52rem] text-muted">購入総額</p>
                <p className="mt-1 text-[0.72rem] font-semibold text-ink tabular">
                  {formatYen(summary.purchaseTotal)}
                </p>
              </div>
              <div>
                <p className="text-[0.52rem] text-muted">現在の価値</p>
                <p className="mt-1 text-[0.72rem] font-semibold text-ink tabular">
                  {formatYen(summary.resaleTotal)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[0.52rem] text-muted">残存率</p>
                <p className="mt-1 text-[0.72rem] font-semibold text-ink tabular">
                  {formatPercent(summary.retentionRate, 0)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[0.55rem] leading-relaxed text-muted">
              {summary.count}点を保有。機材は「使うほど価値が減る」ではなく、記録で見える化。
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
