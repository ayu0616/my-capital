import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  ArrowUpRight,
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
import type { AppSettings, HoldingStockStatus } from '../db/schema'
import {
  formatMonthEta,
  formatPercent,
  addYears,
  parseDateOnly,
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
  const { settings, holding, counts, authRequired } = Route.useLoaderData()
  const router = useRouter()

  return (
    <>
      <PageHeader
        kicker="Studio settings"
        title="設定"
        description="数字の前提を整える。目標年齢も、株価も、いつでも静かに更新できます。"
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
            NISAの到達時期や、富士通株の安全弁を決める前提です。
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
                hint={`${formatMonthEta(targetDate)} が目標時期になります。`}
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
              label="富士通株の安全弁"
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
              hint="半年に1本のための機材基金。"
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
              安全弁は現在{' '}
              <span className="font-semibold text-ink">
                {formatPercent(
                  Math.min(100, Math.max(1, parseNumberInput(alertPercent))) /
                    100,
                  0,
                )}
              </span>{' '}
              に設定されます。
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
  const [monthlyContribution, setMonthlyContribution] = useState(
    String(holding.monthlyContribution),
  )
  const [incentivePercent, setIncentivePercent] = useState(
    String(holding.companyIncentiveRate * 100),
  )
  const [shares, setShares] = useState(String(holding.currentAccumulatedShares))
  const [price, setPrice] = useState(String(holding.latestStockPrice))
  const [targetShares, setTargetShares] = useState(String(holding.targetShares))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contribution = parseYenInput(monthlyContribution)
  const incentive = Math.max(0, parseNumberInput(incentivePercent)) / 100
  const currentShares = Math.max(0, parseNumberInput(shares))
  const stockPrice = Math.max(0, parseNumberInput(price))
  const target = Math.max(1, parseNumberInput(targetShares))
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
            月次拠出・奨励金・株価から、100株までの到達時期を試算します。
          </CardDescription>
        </div>
        <Badge variant="gold">{formatPercent(progress)}</Badge>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
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
            <Field label="現在の保有株数" htmlFor="hold-shares">
              <Input
                id="hold-shares"
                inputMode="decimal"
                value={shares}
                onChange={(event) => setShares(event.target.value)}
              />
            </Field>
            <Field label="最新の株価" htmlFor="hold-price">
              <MoneyInput
                id="hold-price"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </Field>
            <Field label="目標株数（単元）" htmlFor="hold-target">
              <Input
                id="hold-target"
                inputMode="numeric"
                value={targetShares}
                onChange={(event) => setTargetShares(event.target.value)}
              />
            </Field>
          </FieldGrid>

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
                <p className="text-[0.52rem] text-muted">100株まで</p>
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
/*  Data & environment                                                         */
/* -------------------------------------------------------------------------- */

function DataCard({
  counts,
  className,
}: {
  counts: { snapshots: number; gears: number; investments: number }
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardKicker>Data &amp; environment</CardKicker>
          <CardTitle className="mt-1.5">データと環境</CardTitle>
          <CardDescription>
            すべてのデータは Cloudflare D1 に保存されています。
          </CardDescription>
        </div>
        <Database className="size-4 text-muted" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'スナップショット', value: counts.snapshots, to: '/assets' as const },
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
          <CardTitle className="mt-1.5">4つの資産を、ひとつに。</CardTitle>
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
              description: '富士通100株までのカウントダウン',
            },
            {
              icon: Camera,
              title: '実物資産',
              description: 'カメラ機材のリセール価値と残存率',
            },
            {
              icon: GraduationCap,
              title: '人的資本',
              description: '資格・講座・書籍とキャリアのROI',
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
            {authRequired ? 'パスコード保護が有効です' : 'シングルユーザー設計'}
          </p>
          <p className="mt-1.5 text-[0.56rem] leading-relaxed text-muted">
            {authRequired
              ? 'セッションは30日間有効です。共用端末では、使い終わったらログアウトしてください。'
              : '個人用のダッシュボードです。公開する場合は APP_PASSCODE を secret に設定すると、ログイン画面が有効になります。'}
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
