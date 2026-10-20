import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Card } from './card'

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  badge,
  tone = 'brand',
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  badge?: ReactNode
  tone?: 'brand' | 'gold' | 'ink' | 'muted'
  className?: string
}) {
  const tones = {
    brand: 'border-brand/10 bg-brand-soft text-brand',
    gold: 'border-gold/20 bg-gold-soft text-gold-strong',
    ink: 'border-line bg-canvas/70 text-ink-soft',
    muted: 'border-line bg-canvas/60 text-muted',
  }

  return (
    <Card className={cn('relative overflow-hidden p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.64rem] font-medium text-muted">{label}</p>
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg border',
            tones[tone],
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
        <p className="font-display text-[1.4rem] font-semibold leading-none text-ink tabular sm:text-[1.55rem]">
          {value}
        </p>
        {badge}
      </div>
      {hint ? <div className="mt-2 text-[0.6rem] leading-relaxed text-muted">{hint}</div> : null}
    </Card>
  )
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
}
