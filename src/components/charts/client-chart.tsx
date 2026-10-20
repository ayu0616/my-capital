import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

/**
 * Recharts measures the DOM, so render charts only after hydration.
 * This keeps SSR output stable and avoids zero-width flashes.
 */
export function ClientChart({
  height,
  children,
  className,
}: {
  height: number
  children: ReactNode
  className?: string
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className={cn(
          'animate-pulse rounded-xl bg-gradient-to-b from-ink/[0.035] to-transparent',
          className,
        )}
        aria-hidden="true"
      />
    )
  }

  return <div style={{ height }} className={className}>{children}</div>
}
