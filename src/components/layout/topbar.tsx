import { Link } from '@tanstack/react-router'
import { Settings2 } from 'lucide-react'
import { BrandLockup } from './brand-mark'
import { ThemeToggle } from './theme-toggle'

function todayLabel() {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(new Date())
}

export function Topbar() {
  return (
    <header className="topbar sticky top-0 z-40">
      <div className="mx-auto flex h-[4.1rem] max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="lg:hidden" aria-label="ダッシュボードへ">
          <BrandLockup compact />
        </Link>

        <div className="hidden items-center gap-2 text-[0.68rem] font-medium text-muted lg:flex">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full rounded-full bg-positive/50 pulse-soft" />
            <span className="relative inline-flex size-1.5 rounded-full bg-positive" />
          </span>
          Cloudflare D1 に保存
          <span className="mx-1 h-3 w-px bg-line" />
          <span suppressHydrationWarning>{todayLabel()}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span
            suppressHydrationWarning
            className="mr-1 hidden text-[0.68rem] font-medium text-muted sm:block lg:hidden"
          >
            {todayLabel()}
          </span>
          <ThemeToggle />
          <Link
            to="/settings"
            aria-label="設定"
            className="flex size-8 items-center justify-center rounded-full border border-line/80 bg-surface/60 text-muted transition hover:border-brand/25 hover:text-ink"
          >
            <Settings2 className="size-[0.95rem]" />
          </Link>
          <span className="ml-0.5 flex size-8 items-center justify-center rounded-full bg-[linear-gradient(145deg,#e9d4a9,#bb8a45)] font-display text-[0.72rem] font-semibold text-[#10251b] shadow-[inset_0_1px_0_rgba(255,255,255,.5)]">
            A
          </span>
        </div>
      </div>
    </header>
  )
}
