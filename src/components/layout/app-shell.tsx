import { useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { MobileNav, Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:pl-[264px]">
        <Topbar />
        <main className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-7 sm:px-6 lg:px-8 lg:pb-12">
          {children}
          <footer className="mt-14 flex flex-col gap-2 border-t border-line/70 pt-5 text-[0.62rem] text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 Asset &amp; Life Studio</span>
            <span className="flex items-center gap-2">
              <span className="size-1 rounded-full bg-brand/50" />
              Built on Cloudflare Workers · D1 · R2
            </span>
          </footer>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
