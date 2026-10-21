import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { DatabaseZap, RotateCcw } from 'lucide-react'
import { Toaster } from 'sonner'
import { AppShell } from '../components/layout/app-shell'
import { getAuthState } from '../server/auth'
import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (location.pathname === '/login') return
    const auth = await getAuthState()
    if (auth.required && !auth.authenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'Asset & Life Studio' },
      {
        name: 'description',
        content:
          '金融資産、持株会、カメラ機材、自己投資をまとめて管理する個人用ダッシュボード。',
      },
      { name: 'theme-color', content: '#0d211a' },
      { name: 'apple-mobile-web-app-title', content: 'Asset & Life' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: RootError,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            className:
              'font-sans !rounded-2xl !border !border-line !bg-surface !text-ink !shadow-lift',
          }}
        />
        <Scripts />
      </body>
    </html>
  )
}

function RootError({ error, reset }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error)
  const looksLikeDatabase =
    /no such table|D1|database|SQLITE|Failed to fetch/i.test(message)

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center py-10 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-gold/20 bg-gold-soft text-gold-strong">
        <DatabaseZap className="size-6" />
      </div>
      <h1 className="font-display text-3xl font-semibold text-ink">
        データを読み込めませんでした
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        {looksLikeDatabase
          ? 'D1 のテーブルがまだ作成されていない可能性があります。ターミナルでセットアップを実行してから再読み込みしてください。'
          : '一時的なエラーが発生しました。再試行しても解決しない場合は、下のメッセージを確認してください。'}
      </p>
      <pre className="mt-6 max-w-full overflow-x-auto rounded-xl border border-line bg-surface px-4 py-3 text-left text-[0.68rem] leading-relaxed text-muted">
        npm run db:setup
      </pre>
      <p className="mt-3 max-w-full overflow-wrap-anywhere text-[0.65rem] text-muted/70">
        {message}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-7 inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-[0.8rem] font-semibold text-brand-contrast transition hover:bg-brand-strong"
      >
        <RotateCcw className="size-3.5" />
        再試行
      </button>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center">
      <p className="font-display text-[5rem] leading-none text-brand/25">404</p>
      <h1 className="mt-2 text-lg font-bold text-ink">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-muted">
        リンクが変わったか、ページが削除された可能性があります。
      </p>
      <a
        href="/"
        className="mt-6 inline-flex h-10 items-center rounded-full bg-brand px-5 text-[0.8rem] font-semibold text-brand-contrast hover:bg-brand-strong"
      >
        ダッシュボードへ戻る
      </a>
    </div>
  )
}
