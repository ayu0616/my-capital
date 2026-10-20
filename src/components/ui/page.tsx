import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div>
        {kicker ? (
          <p className="mb-1.5 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-brand">
            {kicker}
          </p>
        ) : null}
        <h1 className="font-display text-[2rem] leading-[1.08] font-semibold tracking-[-0.02em] text-ink sm:text-[2.5rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SectionHeading({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div>
        <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="max-w-full overflow-x-auto pb-0.5">{actions}</div> : null}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-line bg-canvas/60 p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'rounded-full px-3 py-1.5 text-[0.7rem] font-semibold whitespace-nowrap transition-colors',
            value === option.value
              ? 'bg-surface text-ink shadow-sm'
              : 'text-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
