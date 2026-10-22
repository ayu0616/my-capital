import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Building2,
  Camera,
  Database,
  GraduationCap,
  Landmark,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
  Sparkles,
  Wallet,
  LogOut,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardKicker,
  CardTitle,
} from '../components/ui/card'
import { Badge, Field, FieldGrid, Input, MoneyInput } from '../components/ui/form'
import { PageHeader } from '../components/ui/page'
import { WithdrawalCard } from '../components/holding/withdrawal-card'
import { RetirementCard } from '../components/settings/retirement-card'
import type {
  AppSettings,
  FinancialAccount,
  HoldingStockStatus,
} from '../db/schema'
import {
  formatMonthEta,
  formatPercent,
  formatSignedPercent,
  formatYen,
  addYears,
  parseDateOnly,
  toDateOnlyString,
  todayDateOnly,
} from '../lib/format'
import { parseNumberInput, parseYenInput } from '../lib/utils'
import { updateHolding, updateSettings } from '../server/actions'
import { logout } from '../server/auth'
import { getSettingsData } from '../server/queries'

export const Route = createFileRoute('/settings')({
  head: () => ({ meta: [{ title: '設定 | Asset & Life Studio' }] }),
  loader: () => getSettingsData(),
  component: SettingsPage,
})

function SettingsPage() {
  const {
    settings,
    holding,
    withdrawals,
    accounts,
    retirement,
    retirementAllocations,
    counts,
    authRequired,
  } = Route.useLoaderData()
  const router = useRouter()

  return (
    <>
      <PageHeader
        kicker="Studio settings"
        title="設定"
        actions={
          <Badge variant="outline" className="h-7 px-3">
            <LockKeyhole className="size-3" />
            Single user
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <ProfileForm
          settings={settings}
          onSaved={() => router.invalidate()}
          className="lg:col-span-7"
        />
        <HoldingForm
          holding={holding}
          onSaved={() => router.invalidate()}
          className="lg:col-span-5"
        />
        <WithdrawalCard
          holding={holding}
          withdrawals={withdrawals}
          className="lg:col-span-7"
        />
        <AccountsCard accounts={accounts} className="lg:col-span-5" />
        <RetirementCard
          account={retirement}
          allocations={retirementAllocations}
          className="lg:col-span-12"
        />
        <DataCard counts={counts} className="lg:col-span-7" />
        <AboutCard
          authRequired={authRequired}
          onLogout={async () => {
            await logout()
            window.location.assign('/login')
          }}
          className="lg:col-span-5"
        />
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Profile / NISA settings                                                    */
/* -------------------------------------------------------------------------- */

function ProfileForm({
  settings,
  onSaved,
  className,
}: {
  settings: AppSettings
  onSaved: () => void
  className?: string
}) {
  const [nickname, setNickname] = useState(settings.nickname)
  const [birthDate, setBirthDate] = useState(settings.birthDate)
  const [nisaTargetAge, setNisaTargetAge] = useState(String(settings.nisaTargetAge))
  const [nisaTargetAmount, setNisaTargetAmount] = useState(
    String(settings.nisaTargetAmount),
  )
  const [alertPercent, setAlertPercent] = useState(
    String(settings.fujitsuAlertThreshold * 100),
  )
  const [gearFundTarget, setGearFundTarget] = useState(
    String(settings.gearFundTarget),
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetDate = addYears(
    parseDateOnly(birthDate),
    Math.max(1, parseNumberInput(nisaTargetAge)),
  )

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await updateSettings({
        data: {
          nickname: nickname.trim(),
          birthDate,
          nisaTargetAge: Math.round(parseNumberInput(nisaTargetAge)),
          nisaTargetAmount: parseYenInput(nisaTargetAmount),
          fujitsuAlertThreshold:
            Math.min(100, Math.max(1, parseNumberInput(alertPercent))) / 100,
          gearFundTarget: Math.max(1, parseYenInput(gearFundTarget)),
        },
      })
      toast.success('プロフィールと目標を更新しました')
      onSaved()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '保存に失敗しました'
      setError(message)
      toast.error(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardKicker>Profile &amp; goals</CardKicker>
          <CardTitle className="mt-1.5">プロフィールと目標</CardTitle>
          <CardDescription>
            プロフィール、NISAの目標時期、富士通株の警告ラインを設定します。
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-5">
          <FieldGrid>
            <Field label="ニックネーム" htmlFor="set-nickname">
              <Input
                id="set-nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={40}
                required
              />
            </Field>
            <Field label="生年月日" htmlFor="set-birth" hint="年齢と目標時期の計算に使います。">
              <Input
                id="set-birth"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                required
              />
            </Field>
          </FieldGrid>

          <div className="rounded-2xl border border-line/70 bg-canvas/35 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Landmark className="size-3.5 text-brand" />
              <p className="text-[0.7rem] font-bold text-ink">新NISAの目標</p>
            </div>
            <FieldGrid>
              <Field label="目標額" htmlFor="set-nisa-target">
                <MoneyInput
                  id="set-nisa-target"
                  value={nisaTargetAmount}
                  onChange={(event) => setNisaTargetAmount(event.target.value)}
                />
              </Field>
              <Field
                label="目標年齢"
                htmlFor="set-nisa-age"
                hint={`目標時期は ${formatMonthEta(targetDate)} です。`}
              >
                <div className="relative">
                  <Input
                    id="set-nisa-age"
                    type="number"
                    min={18}
                    max={80}
                    value={nisaTargetAge}
                    onChange={(event) => setNisaTargetAge(event.target.value)}
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.68rem] text-muted">
                    歳
                  </span>
                </div>
              </Field>
            </FieldGrid>
          </div>

          <FieldGrid>
            <Field
              label="富士通株の警告ライン"
              htmlFor="set-alert"
              hint="総資産に対する比率がこれを超えると警告します。"
            >
              <div className="relative">
                <Input
                  id="set-alert"
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={alertPercent}
                  onChange={(event) => setAlertPercent(event.target.value)}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.68rem] text-muted">
                  %
                </span>
              </div>
            </Field>
            <Field
              label="レンズ積立の目標"
              htmlFor="set-gear-target"
              hint="レンズ購入用の積立目標額。"
            >
              <MoneyInput
                id="set-gear-target"
                value={gearFundTarget}
                onChange={(event) => setGearFundTarget(event.target.value)}
              />
            </Field>
          </FieldGrid>

          {error ? (
            <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.7rem] text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-line/70 pt-4">
            <p className="text-[0.58rem] leading-relaxed text-muted">
              警告ラインは現在{' '}
              <span className="font-semibold text-ink">
                {formatPercent(
                  Math.min(100, Math.max(1, parseNumberInput(alertPercent))) /
                    100,
                  0,
                )}
              </span>{' '}
              です。
            </p>
            <Button type="submit" disabled={pending} size="md">
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {pending ? '保存中…' : '保存する'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  Holding settings                                                           */
/* -------------------------------------------------------------------------- */

function HoldingForm({
  holding,
  onSaved,
  className,
}: {
  holding: HoldingStockStatus
  onSaved: () => void
  className?: string
}) {
  const [recordedAt, setRecordedAt] = useState(
    holding.recordedAt || toDateOnlyString(todayDateOnly()),
  )
  const [monthlyContribution, setMonthlyContribution] = useState(
    String(holding.monthlyContribution),
  )
  const [incentivePercent, setIncentivePercent] = useState(
    String(holding.companyIncentiveRate * 100),
  )
  const [shares, setShares] = useState(String(holding.currentAccumulatedShares))
  const [averagePrice, setAveragePrice] = useState(
    holding.averageAcquisitionPrice ? String(holding.averageAcquisitionPrice) : '',
  )
  const [carryover, setCarryover] = useState(String(holding.carryoverAmount))
  const [price, setPrice] = useState(String(holding.latestStockPrice))
  const [targetShares, setTargetShares] = useState(String(holding.targetShares))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contribution = parseYenInput(monthlyContribution)
  const incentive = Math.max(0, parseNumberInput(incentivePercent)) / 100
  const currentShares = Math.max(0, parseNumberInput(shares))
  const stockPrice = Math.max(0, parseNumberInput(price))
  const target = Math.max(1, parseNumberInput(targetShares))
  const averageAcquisitionPrice = Math.max(0, parseNumberInput(averagePrice))
  const carryoverAmount = parseYenInput(carryover)
  const costBasis =
    averageAcquisitionPrice > 0 ? currentShares * averageAcquisitionPrice : null
  const unrealizedGain =
    costBasis != null && stockPrice > 0
      ? currentShares * (stockPrice - averageAcquisitionPrice)
      : null
  const unrealizedGainRatio =
    costBasis != null && costBasis > 0 && stockPrice > 0
      ? (stockPrice - averageAcquisitionPrice) / averageAcquisitionPrice
      : null
  const monthlyPurchase = contribution * (1 + incentive)
  const monthlyShares = stockPrice > 0 ? monthlyPurchase / stockPrice : 0
  const remaining = Math.max(0, target - currentShares)
  const months = monthlyShares > 0 ? remaining / monthlyShares : null
  const progress = Math.min(1, currentShares / target)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await updateHolding({
        data: {
          monthlyContribution: contribution,
          companyIncentiveRate: Math.min(1, incentive),
          currentAccumulatedShares: currentShares,
          latestStockPrice: stockPrice,
          targetShares: Math.round(target),
          recordedAt,
          averageAcquisitionPrice,
          carryoverAmount,
        },
      })
      toast.success('持株会の設定を更新しました')
      onSaved()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '保存に失敗しました'
      setError(message)
      toast.error(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardKicker>Employee holding</CardKicker>
          <CardTitle className="mt-1.5">富士通・持株会</CardTitle>
          <CardDescription>
            会社ページの記録と、目標株数までの積立プランを管理します。
          </CardDescription>
        </div>
        <Badge variant="gold">{formatPercent(progress)}</Badge>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-5">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Landmark className="size-3.5 text-brand" />
              <p className="text-[0.7rem] font-bold text-ink">会社ページの記録</p>
            </div>
            <FieldGrid>
              <Field
                label="記録日"
                htmlFor="hold-recorded-at"
                hint="会社ページに表示されている基準日。"
              >
                <Input
                  id="hold-recorded-at"
                  type="date"
                  value={recordedAt}
                  onChange={(event) => setRecordedAt(event.target.value)}
                  required
                />
              </Field>
              <Field label="持分株数" htmlFor="hold-shares">
                <Input
                  id="hold-shares"
                  inputMode="decimal"
                  value={shares}
                  onChange={(event) => setShares(event.target.value)}
                />
              </Field>
              <Field label="平均取得単価" htmlFor="hold-average">
                <MoneyInput
                  id="hold-average"
                  inputMode="decimal"
                  value={averagePrice}
                  onChange={(event) => setAveragePrice(event.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field
                label="繰越金"
                htmlFor="hold-carryover"
                hint="次回の購入に使う、持株会内の現金。"
              >
                <MoneyInput
                  id="hold-carryover"
                  value={carryover}
                  onChange={(event) => setCarryover(event.target.value)}
                  placeholder="0"
                />
              </Field>
            </FieldGrid>

            <div className="mt-3 grid grid-cols-2 divide-x divide-line/70 rounded-xl border border-brand/10 bg-brand-soft/45 py-3">
              <div className="px-3">
                <p className="text-[0.52rem] text-brand-ink/60">取得原価</p>
                <p className="mt-1 text-[0.74rem] font-bold text-brand-ink tabular">
                  {costBasis == null ? '—' : formatYen(costBasis)}
                </p>
              </div>
              <div className="px-3">
                <p className="text-[0.52rem] text-brand-ink/60">評価損益</p>
                <p
                  className={
                    unrealizedGain != null && unrealizedGain < 0
                      ? 'mt-1 text-[0.74rem] font-bold text-danger tabular'
                      : 'mt-1 text-[0.74rem] font-bold text-brand-ink tabular'
                  }
                >
                  {unrealizedGain == null
                    ? '—'
                    : formatYen(unrealizedGain, { sign: true })}
                  {unrealizedGainRatio != null ? (
                    <span className="ml-1 text-[0.56rem] font-medium opacity-65">
                      {formatSignedPercent(unrealizedGainRatio)}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-3.5 text-gold" />
              <p className="text-[0.7rem] font-bold text-ink">積立プラン</p>
            </div>
            <FieldGrid>
              <Field label="月次拠出額" htmlFor="hold-contribution">
                <MoneyInput
                  id="hold-contribution"
                  value={monthlyContribution}
                  onChange={(event) => setMonthlyContribution(event.target.value)}
                />
              </Field>
              <Field label="奨励金率" htmlFor="hold-incentive">
                <div className="relative">
                  <Input
                    id="hold-incentive"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={incentivePercent}
                    onChange={(event) => setIncentivePercent(event.target.value)}
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.68rem] text-muted">
                    %
                  </span>
                </div>
              </Field>
              <Field label="目標株数（単元）" htmlFor="hold-target">
                <Input
                  id="hold-target"
                  inputMode="numeric"
                  value={targetShares}
                  onChange={(event) => setTargetShares(event.target.value)}
                />
              </Field>
              <Field
                label="現在の株価"
                htmlFor="hold-price"
                hint="評価額と到達時期の計算に使います。"
              >
                <MoneyInput
                  id="hold-price"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </Field>
            </FieldGrid>
          </section>

          <div className="rounded-2xl border border-gold/20 bg-gold-soft/60 p-4">
            <p className="text-[0.58rem] font-medium text-gold-strong/70">
              この設定でのシミュレーション
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[0.52rem] text-muted">毎月の購入</p>
                <p className="mt-0.5 text-[0.8rem] font-bold text-ink tabular">
                  {monthlyShares.toFixed(1)}株
                </p>
              </div>
              <div>
                <p className="text-[0.52rem] text-muted">目標株数まで</p>
                <p className="mt-0.5 text-[0.8rem] font-bold text-ink">
                  {remaining <= 0
                    ? '達成'
                    : months == null
                      ? '株価を入力'
                      : `約 ${months.toFixed(1)}ヶ月`}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/8">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#b3823d,#e0bd82)]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.7rem] text-danger">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {pending ? '保存中…' : '持株会の設定を保存'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  Accounts                                                                   */
/* -------------------------------------------------------------------------- */

const ACCOUNT_KIND_LABELS: Record<string, string> = {
  brokerage: '証券',
  bank: '銀行',
  pension: '年金',
}

function AccountsCard({
  accounts,
  className,
}: {
  accounts: FinancialAccount[]
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Accounts</CardKicker>
          <CardTitle className="mt-1.5">口座と役割</CardTitle>
          <CardDescription>
            資産の置き場所と、このアプリでの扱いを整理しています。
          </CardDescription>
        </div>
        <Building2 className="size-4 text-muted" />
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {accounts.map((account) => {
            const Icon =
              account.kind === 'bank'
                ? Wallet
                : account.kind === 'pension'
                  ? ShieldCheck
                  : Landmark
            return (
              <li
                key={account.id}
                className="rounded-xl border border-line/80 bg-canvas/35 px-3.5 py-3"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-brand/10 bg-brand-soft text-brand">
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[0.7rem] font-bold text-ink">
                        {account.name}
                      </p>
                      <Badge variant="outline" className="text-[0.52rem]">
                        {ACCOUNT_KIND_LABELS[account.kind] ?? account.kind}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[0.62rem] font-medium text-ink-soft">
                      {account.role}
                    </p>
                    {account.notes ? (
                      <p className="mt-1 text-[0.56rem] leading-relaxed text-muted">
                        {account.notes}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 border-t border-line/70 pt-3 text-[0.56rem] leading-relaxed text-muted">
          残高は月次スナップショット、持株会の株数は「持株会の引出し」、楽天証券の銘柄はCSV取り込みで管理します。
        </p>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  Data & environment                                                         */
/* -------------------------------------------------------------------------- */

function DataCard({
  counts,
  className,
}: {
  counts: {
    snapshots: number
    gears: number
    investments: number
    stockGoals: number
  }
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardKicker>Data &amp; environment</CardKicker>
          <CardTitle className="mt-1.5">データと環境</CardTitle>
          <CardDescription>
            数値とテキストは Cloudflare D1、機材画像は R2 に保存されています。
          </CardDescription>
        </div>
        <Database className="size-4 text-muted" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'スナップショット', value: counts.snapshots, to: '/assets' as const },
            { label: '優待株', value: counts.stockGoals, to: '/stock-goals' as const },
            { label: '機材', value: counts.gears, to: '/gear' as const },
            {
              label: '自己投資',
              value: counts.investments,
              to: '/self-investment' as const,
            },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="rounded-xl border border-line/80 bg-canvas/35 px-3 py-3 transition hover:border-brand/25 hover:bg-brand-soft/30"
            >
              <p className="text-[0.54rem] text-muted">{item.label}</p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-[1.3rem] font-semibold leading-none text-ink tabular">
                  {item.value}
                </span>
                <span className="text-[0.55rem] text-muted">件</span>
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-5">
          <p className="text-[0.64rem] font-semibold text-ink">ローカルセットアップ</p>
          <pre className="mt-2 overflow-x-auto rounded-xl border border-line bg-[#0f1c16] px-3.5 py-3 text-[0.64rem] leading-relaxed text-[#cfe3d7]">
            <code>{`npm run db:migrate
npm run db:seed     # デモデータ（任意）
npm run dev`}</code>
          </pre>
          <p className="mt-2 text-[0.56rem] leading-relaxed text-muted">
            デモデータは何度実行しても重複しません。本番環境では{' '}
            <code className="rounded bg-canvas px-1 py-0.5 text-[0.58rem] text-ink">
              npm run db:migrate:remote
            </code>{' '}
            を実行してください。
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-line/80 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">Database</p>
            <p className="mt-0.5 text-[0.66rem] font-semibold text-ink">
              Cloudflare D1
            </p>
          </div>
          <div className="rounded-xl border border-line/80 px-3 py-2.5">
            <p className="text-[0.52rem] text-muted">Object storage</p>
            <p className="mt-0.5 text-[0.66rem] font-semibold text-ink">
              Cloudflare R2
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AboutCard({
  authRequired,
  onLogout,
  className,
}: {
  authRequired: boolean
  onLogout: () => void | Promise<void>
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardKicker>About</CardKicker>
          <CardTitle className="mt-1.5">管理している項目</CardTitle>
        </div>
        <Sparkles className="size-4 text-gold" />
      </CardHeader>
      <CardContent>
        <ul className="space-y-3.5">
          {[
            {
              icon: Wallet,
              title: '金融資産',
              description: '現預金・オルカン・S&P 500・NISAの進捗',
            },
            {
              icon: Landmark,
              title: '持株会',
              description: '富士通株の保有数、目標株数までの進捗、SMBC日興証券への引出し履歴',
            },
            {
              icon: Camera,
              title: '実物資産',
              description: 'カメラ機材の買取目安と残存率',
            },
            {
              icon: GraduationCap,
              title: '自己投資',
              description: '資格・講座・書籍の費用とキャリアイベントのROI',
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-brand/10 bg-brand-soft text-brand">
                  <Icon className="size-3.5" />
                </span>
                <div>
                  <p className="text-[0.7rem] font-bold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[0.6rem] leading-relaxed text-muted">
                    {item.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 rounded-xl border border-line/80 bg-canvas/35 p-3.5">
          <p className="flex items-center gap-1.5 text-[0.6rem] font-semibold text-ink">
            <ShieldCheck className="size-3.5 text-positive" />
            {authRequired ? 'パスコード保護が有効です' : 'パスコード保護は未設定です'}
          </p>
          <p className="mt-1.5 text-[0.56rem] leading-relaxed text-muted">
            {authRequired
              ? 'セッションは30日間有効です。共用端末では、使い終わったらログアウトしてください。'
              : '個人用のダッシュボードです。公開する場合は APP_PASSCODE を設定すると、ログイン画面が有効になります。'}
          </p>
          {authRequired ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={onLogout}
            >
              <LogOut className="size-3.5" />
              ログアウト
            </Button>
          ) : null}
        </div>

        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1 text-[0.62rem] font-semibold text-brand underline decoration-brand/25 underline-offset-2"
        >
          ダッシュボードへ戻る
          <ArrowUpRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  )
}
