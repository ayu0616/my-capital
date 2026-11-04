import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '../components/ui/page'

const SWAGGER_UI_VERSION = '5.30.2'
const SWAGGER_UI_BASE = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`
const SWAGGER_UI_SCRIPT = `${SWAGGER_UI_BASE}/swagger-ui-bundle.js`
const SWAGGER_UI_STYLES = `${SWAGGER_UI_BASE}/swagger-ui.css`

type SwaggerUIBundleOptions = {
  url: string
  domNode: HTMLElement
  deepLinking: boolean
  persistAuthorization: boolean
  displayRequestDuration: boolean
}

type SwaggerUIBundle = (options: SwaggerUIBundleOptions) => unknown

export const Route = createFileRoute('/api-docs')({
  head: () => ({ meta: [{ title: 'APIドキュメント | Asset & Life Studio' }] }),
  component: ApiDocsPage,
})

function loadStylesheet(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    )
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true'
        resolve()
      },
      { once: true },
    )
    script.addEventListener(
      'error',
      () => reject(new Error(`Failed to load ${src}`)),
      { once: true },
    )
    document.head.appendChild(script)
  })
}

function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false

    loadStylesheet(SWAGGER_UI_STYLES)
    loadScript(SWAGGER_UI_SCRIPT)
      .then(() => {
        if (cancelled) return
        const bundle = (
          window as Window & { SwaggerUIBundle?: SwaggerUIBundle }
        ).SwaggerUIBundle
        if (!bundle) throw new Error('SwaggerUIBundle is not available')
        container.innerHTML = ''
        bundle({
          url: '/openapi.json',
          domNode: container,
          deepLinking: true,
          persistAuthorization: true,
          displayRequestDuration: true,
        })
        if (!cancelled) setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHeader
        kicker="API reference"
        title="APIドキュメント"
        description="連携APIの仕様を確認し、そのまま呼び出せます。APIキーは Authorize から設定してください。"
        actions={
          <a
            href="/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-surface px-3 text-[0.7rem] font-semibold text-ink transition hover:border-brand/25 hover:bg-brand-soft/30"
          >
            OpenAPI JSON
            <ExternalLink className="size-3" />
          </a>
        }
      />

      <div className="relative min-h-[70vh] overflow-hidden rounded-2xl border border-line bg-white px-3 py-2 sm:px-5">
        <div ref={containerRef} />
        {status === 'loading' ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white text-[0.72rem] text-muted">
            <Loader2 className="size-4 animate-spin" />
            読み込み中…
          </div>
        ) : null}
        {status === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white px-6 text-center">
            <p className="text-[0.8rem] font-semibold text-ink">
              APIドキュメントを読み込めませんでした
            </p>
            <p className="text-[0.68rem] leading-relaxed text-muted">
              Swagger UI の取得に失敗しました。ネットワーク接続を確認してから再読み込みしてください。
            </p>
            <a
              href="/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[0.68rem] font-semibold text-brand underline decoration-brand/25 underline-offset-2"
            >
              OpenAPI仕様（JSON）を開く
              <ExternalLink className="size-3" />
            </a>
          </div>
        ) : null}
      </div>
    </>
  )
}
