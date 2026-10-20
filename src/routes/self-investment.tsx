import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  BookOpen,
  GraduationCap,
  Pencil,
  Plus,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CareerDialog } from '../components/self-investment/career-dialog'
import { InvestmentDialog } from '../components/self-investment/investment-dialog'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ConfirmDialog } from '../components/ui/dialog'
import { EmptyState } from '../components/ui/empty-state'
import { Badge } from '../components/ui/form'
import { MetricCard, MetricGrid } from '../components/ui/metric'
import { PageHeader, Segmented } from '../components/ui/page'
import type { CareerEvent, SelfInvestment } from '../db/schema'
import {
  buildHumanCapital,
  categoryLabel,
} from '../lib/finance'
import {
  formatDateJa,
  formatPercent,
  formatYen,
} from '../lib/format'
import {
  deleteCareerEvent,
  deleteInvestment,
} from '../server/actions'
import { getSelfInvestmentData } from '../server/queries'

export const Route = createFileRoute('/self-investment')({
  head: () => ({
    meta: [{ title: '自己投資 | Asset & Life Studio' }],
  }),
  loader: () => getSelfInvestmentData(),
  component: SelfInvestmentPage,
})

type Filter = 'all' | 'cert' | 'udemy' | 'book' | 'other'

const categoryVariant: Record<
  string,
  'brand' | 'success' | 'warning' | 'neutral'
> = {
  cert: 'brand',
  udemy: 'success',
  book: 'warning',
  other: 'neutral',
}

type DeleteTarget =
  | { type: 'investment'; item: SelfInvestment }
  | { type: 'career'; item: CareerEvent }

function SelfInvestmentPage() {
  const { investments, careerEvents } = Route.useLoaderData()
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [investmentOpen, setInvestmentOpen] = useState(false)
  const [careerOpen, setCareerOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] =
    useState<SelfInvestment | null>(null)
  const [editingCareer, setEditingCareer] = useState<CareerEvent | null>(null)
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const summary = buildHumanCapital(investments, careerEvents)
  const filtered =
    filter === 'all'
      ? investments
      : investments.filter((item) => item.category === filter)

  function openInvestment(item: SelfInvestment | null) {
    setEditingInvestment(item)
    setInvestmentOpen(true)
  }

  function openCareer(item: CareerEvent | null) {
    setEditingCareer(item)
    setCareerOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeletePending(true)
    try {
      if (deleting.type === 'investment') {
        await deleteInvestment({ data: { id: deleting.item.id } })
        toast.success('自己投資の記録を削除しました')
      } else {
        await deleteCareerEvent({ data: { id: deleting.item.id } })
        toast.success('キャリアイベントを削除しました')
      }
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
        kicker="Human capital"
        title="自己投資"
        description="資格も、講座も、本も。学びにお金を使うことは、未来の自分への出資。"
        actions={
          <>
            <Button variant="outline" onClick={() => openCareer(null)}>
              <TrendingUp className="size-3.5" />
              キャリアを記録
            </Button>
            <Button onClick={() => openInvestment(null)}>
              <Plus className="size-3.5" />
              自己投資を追加
            </Button>
          </>
        }
      />

      <MetricGrid>
        <MetricCard
          label="自己投資の累計"
          value={formatYen(summary.totalCost)}
          icon={GraduationCap}
          tone="ink"
          hint={`${summary.count}件の学び`}
        />
        <MetricCard
          label="年収の増加"
          value={formatYen(summary.annualGain, { sign: true })}
          icon={TrendingUp}
          tone="brand"
          hint={`${careerEvents.length}件のキャリアイベント`}
        />
        <MetricCard
          label="投資ROI"
          value={
            summary.roi == null ? '—' : `+${formatPercent(summary.roi, 0)}`
          }
          icon={Sparkles}
          tone="gold"
          hint="年収増 ÷ 自己投資コスト"
        />
        <MetricCard
          label="回収期間"
          value={
            summary.paybackMonths == null
              ? '—'
              : `${summary.paybackMonths < 1 ? summary.paybackMonths.toFixed(1) : Math.ceil(summary.paybackMonths)}ヶ月`
          }
          icon={Timer}
          tone="muted"
          hint="単純計算 · 税金・手取りは考慮せず"
        />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader className="items-start">
            <div>
              <CardTitle>投資の内訳</CardTitle>
              <p className="mt-1 text-[0.68rem] text-muted">
                何に、どれだけ使ったか。
              </p>
            </div>
            <Badge variant="gold">ROI</Badge>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="rounded-2xl border border-brand/10 bg-brand-soft/70 px-4 py-4">
              <p className="text-[0.58rem] font-medium text-brand-ink/65">
                年収増 / 投資コスト
              </p>
              <p className="mt-1 font-display text-[2.2rem] font-semibold leading-none text-brand-ink tabular">
                {summary.roi == null
                  ? '—'
                  : `+${formatPercent(summary.roi, 0)}`}
              </p>
              <p className="mt-2 text-[0.62rem] leading-relaxed text-brand-ink/65">
                {summary.annualGain > 0
                  ? `${formatYen(summary.totalCost)} の投資で、年間 ${formatYen(summary.annualGain)} のリターン。月あたり ${formatYen(summary.monthlyGain)}。`
                  : 'キャリアイベントを記録すると、投資対効果が見えてきます。'}
              </p>
            </div>

            <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-ink/8">
              {summary.byCategory
                .filter((category) => category.amount > 0)
                .map((category) => (
                  <span
                    key={category.key}
                    className="h-full"
                    style={{
                      width: `${category.ratio * 100}%`,
                      backgroundColor: category.color,
                    }}
                  />
                ))}
            </div>

            <ul className="mt-4 space-y-2.5">
              {summary.byCategory.map((category) => (
                <li key={category.key} className="flex items-center gap-2.5">
                  <span
                    className="size-2 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="flex-1 text-[0.68rem] text-ink-soft">
                    {category.label}
                  </span>
                  <span className="text-[0.58rem] text-muted">
                    {category.count}件
                  </span>
                  <span className="w-16 text-right text-[0.66rem] font-semibold text-ink tabular">
                    {formatYen(category.amount)}
                  </span>
                  <span className="w-10 text-right text-[0.58rem] text-muted tabular">
                    {formatPercent(category.ratio, 0)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="items-center">
            <div>
              <CardTitle>キャリアイベント</CardTitle>
              <p className="mt-1 text-[0.68rem] text-muted">
                昇格・昇給の履歴が、ROIの根拠になります。
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCareer(null)}
            >
              <Plus className="size-3.5" />
              追加
            </Button>
          </CardHeader>
          <CardContent className="pt-3">
            {careerEvents.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="キャリアの節目を記録しましょう"
                description="昇格や昇給のタイミングと年収の増加額を登録すると、自己投資のリターンが計算できます。"
                action={
                  <Button onClick={() => openCareer(null)}>
                    キャリアイベントを追加
                  </Button>
                }
              />
            ) : (
              <ol className="relative ml-1.5 space-y-6 border-l border-line pl-5">
                {careerEvents.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[1.42rem] top-1.5 size-2.5 rounded-full border-2 border-surface bg-gold shadow-[0_0_0_3px_var(--gold-soft)]" />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[0.8rem] font-bold text-ink">
                          {event.title}
                        </p>
                        <p className="mt-0.5 text-[0.6rem] text-muted">
                          {formatDateJa(event.occurredAt)} ·{' '}
                          {event.notes || 'メモなし'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="success">
                          年収 +{formatYen(event.annualIncomeIncrease)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="キャリアイベントを編集"
                          onClick={() => openCareer(event)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="キャリアイベントを削除"
                          className="text-muted hover:text-danger"
                          onClick={() => setDeleting({ type: 'career', item: event })}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="items-center">
          <div>
            <CardTitle>学びの記録</CardTitle>
            <p className="mt-1 text-[0.68rem] text-muted">
              {investments.length}件 · 累計 {formatYen(summary.totalCost)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Segmented
              ariaLabel="カテゴリーフィルター"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `すべて ${investments.length}` },
                {
                  value: 'cert',
                  label: `資格 ${investments.filter((item) => item.category === 'cert').length}`,
                },
                {
                  value: 'udemy',
                  label: `講座 ${investments.filter((item) => item.category === 'udemy').length}`,
                },
                {
                  value: 'book',
                  label: `書籍 ${investments.filter((item) => item.category === 'book').length}`,
                },
              ]}
            />
            <Button size="sm" onClick={() => openInvestment(null)}>
              <Plus className="size-3.5" />
              追加
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={investments.length === 0 ? '最初の学びを記録しましょう' : 'このカテゴリーは空です'}
              description="資格・Udemy・書籍の費用を記録すると、人的資本の投資対効果が見えてきます。"
              action={
                <Button onClick={() => openInvestment(null)}>
                  自己投資を追加
                </Button>
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted">
                      <th className="py-2.5 pr-3 font-bold">タイトル</th>
                      <th className="px-3 py-2.5 font-bold">カテゴリー</th>
                      <th className="px-3 py-2.5 font-bold">完了日</th>
                      <th className="px-3 py-2.5 text-right font-bold">自己負担</th>
                      <th className="px-3 py-2.5 font-bold">メモ</th>
                      <th className="py-2.5 pl-3 text-right font-bold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="group border-b border-line/60 last:border-0 hover:bg-brand-soft/20"
                      >
                        <td className="py-3 pr-3">
                          <p className="text-[0.74rem] font-semibold text-ink">
                            {item.title}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={categoryVariant[item.category] ?? 'neutral'}>
                            {categoryLabel(item.category)}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-[0.66rem] text-muted">
                          {formatDateJa(item.completedAt, { withYear: true })}
                        </td>
                        <td className="px-3 py-3 text-right text-[0.7rem] font-semibold text-ink tabular">
                          {formatYen(item.cost)}
                        </td>
                        <td className="max-w-[14rem] truncate px-3 py-3 text-[0.62rem] text-muted">
                          {item.notes || '—'}
                        </td>
                        <td className="py-3 pl-3">
                          <div className="flex items-center justify-end gap-0.5 opacity-60 transition group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="編集"
                              onClick={() => openInvestment(item)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="削除"
                              className="text-muted hover:text-danger"
                              onClick={() =>
                                setDeleting({ type: 'investment', item })
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line/70 md:hidden">
                {filtered.map((item) => (
                  <li key={item.id} className="py-3.5 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[0.76rem] font-semibold text-ink">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[0.58rem] text-muted">
                          {categoryLabel(item.category)} ·{' '}
                          {formatDateJa(item.completedAt)}
                        </p>
                      </div>
                      <p className="shrink-0 text-[0.74rem] font-bold text-ink tabular">
                        {formatYen(item.cost)}
                      </p>
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInvestment(item)}
                      >
                        <Pencil className="size-3" />
                        編集
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted hover:text-danger"
                        onClick={() => setDeleting({ type: 'investment', item })}
                      >
                        削除
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 rounded-2xl border border-line/70 bg-surface/40 px-4 py-3 text-[0.6rem] leading-relaxed text-muted">
        ROIは「キャリアイベントの年収増加額の合計 ÷ 自己投資コスト」による単純計算です。実際の手取りや税金、時間コストは含みません。判断の目安として使ってください。
      </p>

      <InvestmentDialog
        open={investmentOpen}
        onOpenChange={setInvestmentOpen}
        investment={editingInvestment}
      />
      <CareerDialog
        open={careerOpen}
        onOpenChange={setCareerOpen}
        event={editingCareer}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onConfirm={confirmDelete}
        pending={deletePending}
        title={
          deleting?.type === 'career'
            ? 'キャリアイベントを削除しますか？'
            : '自己投資の記録を削除しますか？'
        }
        description={
          deleting
            ? `「${deleting.item.title}」を削除します。この操作は取り消せません。`
            : ''
        }
      />
    </>
  )
}
