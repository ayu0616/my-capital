import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

const tones = {
  brand: 'bg-brand',
  gold: 'bg-gold',
  positive: 'bg-positive',
  danger: 'bg-danger',
  ink: 'bg-ink',
  muted: 'bg-muted',
} as const

export function Progress({
  value,
  tone = 'brand',
  className,
  barClassName,
  label,
}: {
  value: number
  tone?: keyof typeof tones
  className?: string
  barClassName?: string
  label?: string
}) {
  const pct = Math.max(0, Math.min(100, value * 100))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-ink/8', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          tones[tone],
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Dot({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-1.5 rounded-full bg-current', className)}
      {...props}
    />
  )
}
