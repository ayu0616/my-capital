import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Camera,
  CircleDollarSign,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { LensFundCard } from '../components/dashboard/lens-fund-card'
import { GearArtwork } from '../components/gear/gear-artwork'
import { GearDialog } from '../components/gear/gear-dialog'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ConfirmDialog } from '../components/ui/dialog'
import { EmptyState } from '../components/ui/empty-state'
import { Badge } from '../components/ui/form'
import { MetricCard, MetricGrid } from '../components/ui/metric'
import { PageHeader, SectionHeading, Segmented } from '../components/ui/page'
import type { CameraGear } from '../db/schema'
import {
  buildGearSummary,
  gearCategoryLabel,
} from '../lib/finance'
import { formatDateJa, formatPercent, formatYen } from '../lib/format'
import { deleteGear } from '../server/actions'
import { getGearData } from '../server/queries'

export const Route = createFileRoute('/gear')({
  head: () => ({
    meta: [{ title: '機材台帳 | Asset & Life Studio' }],
  }),
  loader: () => getGearData(),
  component: GearPage,
})

type Filter = 'all' | 'body' | 'lens' | 'accessory'

function GearPage() {
  const { settings, gears } = Route.useLoaderData()
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CameraGear | null>(null)
  const [deleting, setDeleting] = useState<CameraGear | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const summary = buildGearSummary(gears)
  const filtered =
    filter === 'all' ? gears : gears.filter((gear) => gear.category === filter)
  const gainTone = summary.gain >= 0 ? 'brand' : 'gold'

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(gear: CameraGear) {
    setEditing(gear)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteGear({ data: { id: deleting.id } })
      toast.success('機材を削除しました')
      setDeleting(null)
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '削除に失敗しました')
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <>
      <PageHeader
        kicker="Gear ledger"
        title="機材台帳"
        actions={
          <Button onClick={openNew}>
            <Plus className="size-3.5" />
            機材を追加
          </Button>
        }
      />

      <MetricGrid>
        <MetricCard
          label="購入総額"
          value={formatYen(summary.purchaseTotal)}
          icon={ShoppingBag}
          tone="ink"
          hint={`${summary.count}点の機材`}
        />
        <MetricCard
          label="現在の買取目安"
          value={formatYen(summary.resaleTotal)}
          icon={CircleDollarSign}
          tone="gold"
          hint="中古買取の目安合計"
        />
        <MetricCard
          label="含み損益"
          value={formatYen(summary.gain, { sign: true })}
          icon={summary.gain >= 0 ? TrendingUp : TrendingDown}
          tone={gainTone}
          badge={
            <Badge variant={summary.gain >= 0 ? 'success' : 'warning'}>
              {formatPercent(summary.retentionRate, 0)} 残存率
            </Badge>
          }
          hint="現在の買取目安 − 購入価格"
        />
        <MetricCard
          label="残存率"
          value={formatPercent(summary.retentionRate, 1)}
          icon={Camera}
          tone="brand"
          hint="現在の買取目安 ÷ 購入価格"
        />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <LensFundCard className="lg:col-span-5" settings={settings} />
        <Card className="lg:col-span-7">
          <CardHeader>
            <div>
              <CardTitle>カテゴリー別の購入額と買取目安</CardTitle>
              <p className="mt-1 text-[0.68rem] text-muted">
                カテゴリーごとの購入額と現在の買取目安。
              </p>
            </div>
            <Badge variant="gold">{formatYen(summary.resaleTotal)}</Badge>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-3.5">
              {summary.byCategory.map((category) => {
                const retention =
                  category.purchase > 0 ? category.resale / category.purchase : 0
                return (
                  <div key={category.key}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-ink">
                        {category.label}
                        <span className="text-[0.56rem] font-normal text-muted">
                          {category.count}点
                        </span>
                      </p>
                      <p className="text-[0.62rem] text-muted tabular">
                        {formatYen(category.purchase)} →{' '}
                        <span className="font-semibold text-ink">
                          {formatYen(category.resale)}
                        </span>
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#7a6550,#b3823d)]"
                        style={{ width: `${Math.min(100, retention * 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-5 border-t border-line/70 pt-3 text-[0.6rem] leading-relaxed text-muted">
              機材の買取目安は、月次スナップショットの機材価値に反映されます。買取価格が変わったら台帳を更新してください。
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <SectionHeading
          title="機材一覧"
          description={`${gears.length}点を保有中`}
          actions={
            <div className="flex items-center gap-2">
              <Segmented
                ariaLabel="カテゴリーフィルター"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: `すべて ${gears.length}` },
                  {
                    value: 'body',
                    label: `ボディ ${gears.filter((gear) => gear.category === 'body').length}`,
                  },
                  {
                    value: 'lens',
                    label: `レンズ ${gears.filter((gear) => gear.category === 'lens').length}`,
                  },
                  {
                    value: 'accessory',
                    label: `アクセサリー ${gears.filter((gear) => gear.category === 'accessory').length}`,
                  },
                ]}
              />
            </div>
          }
        />

        {gears.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="機材が登録されていません"
            description="レンズやボディの購入額と買取目安を登録すると、機材の買取目安が純資産に加わります。"
            action={<Button onClick={openNew}>最初の機材を追加</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="このカテゴリーは空です"
            description="フィルターを切り替えるか、新しい機材を追加してください。"
            action={<Button onClick={openNew}>機材を追加</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((gear, index) => {
              const retention =
                gear.purchasePrice > 0 ? gear.resaleValue / gear.purchasePrice : 0
              const gain = gear.resaleValue - gear.purchasePrice
              return (
                <Card
                  key={gear.id}
                  className="group flex flex-col overflow-hidden transition-[border-color,box-shadow] duration-300 hover:border-brand/25 hover:shadow-lift"
                  style={{
                    animationDelay: `${Math.min(index, 6) * 55}ms`,
                  }}
                >
                  <div className="relative">
                    <GearArtwork
                      category={gear.category}
                      imageKey={gear.imageKey}
                      name={gear.name}
                      className="h-40 sm:h-44"
                    />
                    <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/35 px-2.5 py-0.5 text-[0.58rem] font-semibold text-white/85 backdrop-blur">
                      {gearCategoryLabel(gear.category)}
                    </span>
                    <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/35 px-2.5 py-0.5 text-[0.6rem] font-bold text-white/90 backdrop-blur tabular">
                      {formatYen(gear.resaleValue)}
                    </span>
                  </div>

                  <CardContent className="flex flex-1 flex-col pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 text-[0.82rem] font-bold leading-snug text-ink">
                        {gear.name}
                      </h3>
                      <Badge variant={gain >= 0 ? 'success' : 'warning'}>
                        {formatYen(gain, { sign: true })}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[0.58rem] text-muted">
                      {formatDateJa(gear.purchasedAt, { withYear: true })} 購入 ·{' '}
                      {formatYen(gear.purchasePrice)}
                    </p>

                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[0.52rem] text-muted">現在の買取目安</p>
                        <p className="mt-0.5 font-display text-[1.1rem] font-semibold leading-none text-ink tabular">
                          {formatYen(gear.resaleValue)}
                        </p>
                      </div>
                      <p className="text-[0.58rem] text-muted">
                        残存{' '}
                        <span className="font-semibold text-ink">
                          {formatPercent(retention, 0)}
                        </span>
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/8">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#5b9c82,#b3823d)]"
                        style={{ width: `${Math.min(100, retention * 100)}%` }}
                      />
                    </div>

                    {gear.notes ? (
                      <p className="mt-3 line-clamp-2 text-[0.6rem] leading-relaxed text-muted">
                        {gear.notes}
                      </p>
                    ) : null}

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/70 pt-3">
                      <span className="text-[0.56rem] text-muted">
                        {gear.imageKey ? '写真あり' : '写真なし'}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(gear)}
                          className="h-7 gap-1 px-2 text-[0.62rem]"
                        >
                          <Pencil className="size-3" />
                          編集
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleting(gear)}
                          aria-label={`${gear.name}を削除`}
                          className="size-7 text-muted hover:text-danger"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <GearDialog open={dialogOpen} onOpenChange={setDialogOpen} gear={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onConfirm={confirmDelete}
        pending={deletePending}
        title="機材を削除しますか？"
        description={
          deleting
            ? `「${deleting.name}」を台帳から削除します。登録した写真も削除されます。`
            : ''
        }
      />
    </>
  )
}
