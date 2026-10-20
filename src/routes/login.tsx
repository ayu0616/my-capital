import { createFileRoute, redirect } from '@tanstack/react-router'
import { KeyRound, Loader2, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/form'
import { getAuthState, login } from '../server/auth'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [{ title: 'ログイン | Asset & Life Studio' }],
  }),
  loader: async () => {
    const auth = await getAuthState()
    if (!auth.required || auth.authenticated) {
      throw redirect({ to: '/' })
    }
    return null
  },
  component: LoginPage,
})

function safeRedirect(value: string | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

function LoginPage() {
  const { redirect } = Route.useSearch()
  const [passcode, setPasscode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!passcode.trim()) return
    setPending(true)
    setError(null)
    try {
      const result = await login({ data: { passcode: passcode.trim() } })
      if (!result.ok) {
        setError(result.error)
        setPending(false)
        return
      }
      window.location.assign(safeRedirect(redirect))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ログインに失敗しました')
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-[#0b1f18] px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-24 size-[30rem] rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-8 size-[22rem] rounded-full border border-white/8"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-[radial-gradient(circle,rgba(193,145,63,0.16),transparent_65%)]"
        />

        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[linear-gradient(145deg,#f3d49a,#c1913f)] font-display text-xl font-semibold text-[#26301f] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            A
          </span>
          <span>
            <span className="block font-display text-lg leading-none font-semibold tracking-tight">
              Asset &amp; Life
            </span>
            <span className="mt-1 block text-[0.55rem] font-bold tracking-[0.28em] text-white/40">
              STUDIO
            </span>
          </span>
        </div>

        <div className="relative mt-16 max-w-md lg:mt-0">
          <p className="text-[0.6rem] font-bold tracking-[0.24em] text-[#d6b579]">
            PRIVATE LEDGER
          </p>
          <h1 className="mt-4 font-display text-[2.1rem] leading-[1.28] font-medium tracking-tight text-white sm:text-[2.6rem]">
            数字は、あなたの
            <br />
            静かな伴走者。
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-[1.9] text-white/55">
            資産も、機材も、学びも。人生の選択をひとつの台帳に。
            この場所は、あなただけのものです。
          </p>
        </div>

        <div className="relative mt-12 grid max-w-md grid-cols-3 gap-3 border-t border-white/10 pt-6 lg:mt-0">
          {[
            ['金融資産', 'NISA / 現金'],
            ['実物資産', 'カメラ機材'],
            ['人的資本', '資格 / キャリア'],
          ].map(([title, sub]) => (
            <div key={title}>
              <p className="text-[0.62rem] font-semibold text-white/80">{title}</p>
              <p className="mt-1 text-[0.55rem] leading-relaxed text-white/35">
                {sub}
              </p>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="grid size-12 place-items-center rounded-2xl border border-brand/15 bg-brand-soft text-brand">
            <LockKeyhole className="size-5" />
          </div>
          <p className="mt-6 text-[0.6rem] font-bold tracking-[0.2em] text-brand">
            AUTHENTICATION
          </p>
          <h2 className="mt-2 font-display text-[1.9rem] leading-tight font-semibold tracking-tight text-ink">
            おかえりなさい。
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            この台帳を開くためのパスコードを入力してください。
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label
              htmlFor="passcode"
              className="block text-[0.66rem] font-semibold tracking-wide text-ink"
            >
              パスコード
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                id="passcode"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                placeholder="••••••••"
                className="h-12 pl-10"
                required
              />
            </div>
            {error ? (
              <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.72rem] text-danger">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full"
              disabled={pending || !passcode.trim()}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  確認中…
                </>
              ) : (
                '台帳を開く'
              )}
            </Button>
          </form>

          <div className="mt-8 flex items-start gap-2 rounded-xl border border-line bg-surface/70 px-3.5 py-3">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-muted" />
            <p className="text-[0.62rem] leading-relaxed text-muted">
              セッションは30日間、この端末にだけ保持されます。
              パスコードはサーバー側の secret で管理され、画面には保存されません。
            </p>
          </div>

          <p className="mt-8 text-[0.56rem] leading-relaxed text-muted/70">
            パスコードがわからない場合は、この台帳の管理者に確認してください。
          </p>
        </div>
      </main>
    </div>
  )
}
