import { Link, useMatchRoute } from '@tanstack/react-router'
import {
  Camera,
  Gift,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Wallet,
} from 'lucide-react'
import { BrandMark } from './brand-mark'

const navItems = [
  { to: '/', label: 'ダッシュボード', icon: LayoutDashboard, code: '01' },
  { to: '/assets', label: '資産管理', icon: Wallet, code: '02' },
  { to: '/stock-goals', label: '優待株', icon: Gift, code: '03' },
  { to: '/gear', label: '機材台帳', icon: Camera, code: '04' },
  { to: '/self-investment', label: '自己投資', icon: GraduationCap, code: '05' },
  { to: '/settings', label: '設定', icon: Settings, code: '06' },
] as const

export function Sidebar() {
  const matchRoute = useMatchRoute()

  return (
    <aside className="sidebar-shell fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col overflow-hidden px-5 pb-5 pt-6 lg:flex">
      <div className="relative z-10 flex items-center gap-3 px-1">
        <BrandMark />
        <div>
          <p className="text-[0.82rem] font-extrabold tracking-[0.01em] text-white">
            Asset &amp; Life
          </p>
          <p className="mt-0.5 text-[0.53rem] font-bold tracking-[0.34em] text-[#c9a870]">
            STUDIO
          </p>
        </div>
      </div>

      <nav className="relative z-10 mt-10 space-y-1" aria-label="メインナビゲーション">
        <p className="mb-3 px-2 text-[0.55rem] font-bold uppercase tracking-[0.26em] text-white/35">
          Workspace
        </p>
        {navItems.map((item) => {
          const active = Boolean(
            matchRoute({ to: item.to, fuzzy: item.to !== '/' }),
          )
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              data-active={active}
              className="nav-item"
            >
              <Icon className="size-[1.05rem] shrink-0 opacity-90" strokeWidth={1.9} />
              <span>{item.label}</span>
              <span className="ml-auto text-[0.55rem] font-bold tracking-[0.08em] text-white/20">
                {item.code}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="relative z-10 mt-auto space-y-4">
        <Link
          to="/settings"
          className="group flex items-center gap-2.5 border-t border-white/10 pt-4"
        >
          <span className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[0.7rem] font-bold text-white/80">
            ALS
          </span>
          <span className="min-w-0">
            <span className="block text-[0.68rem] font-semibold text-white/80">
              Personal Studio
            </span>
            <span className="mt-0.5 block text-[0.56rem] text-white/35">
              Single user · D1
            </span>
          </span>
          <Settings className="ml-auto size-3.5 text-white/25 transition group-hover:text-white/60" />
        </Link>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const matchRoute = useMatchRoute()

  return (
    <nav
      className="mobile-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 lg:hidden"
      aria-label="モバイルナビゲーション"
    >
      {navItems.map((item) => {
        const active = Boolean(
          matchRoute({ to: item.to, fuzzy: item.to !== '/' }),
        )
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            data-active={active}
            className="mobile-nav-item"
          >
            <Icon className="size-[1.15rem]" strokeWidth={active ? 2.4 : 1.8} />
            <span>{item.label === 'ダッシュボード' ? 'ホーム' : item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
