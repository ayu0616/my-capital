import { cva, type VariantProps } from 'class-variance-authority'
import { ChevronDown } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold leading-5 whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'border-line bg-canvas/70 text-muted',
        brand: 'border-brand/15 bg-brand-soft text-brand-ink',
        success: 'border-positive/15 bg-positive/10 text-positive',
        warning: 'border-gold/25 bg-gold/10 text-gold-strong',
        danger: 'border-danger/20 bg-danger/10 text-danger',
        gold: 'border-gold/30 bg-gold/12 text-gold-strong',
        outline: 'border-line bg-transparent text-muted',
        dark: 'border-white/15 bg-white/10 text-white/80 backdrop-blur',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

/* -------------------------------------------------------------------------- */
/*  Form primitives                                                            */
/* -------------------------------------------------------------------------- */

const fieldBase =
  'w-full rounded-xl border border-line bg-canvas/45 px-3.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/45 focus:bg-surface focus:ring-4 focus:ring-brand/8 disabled:cursor-not-allowed disabled:opacity-60'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldBase, 'h-10', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldBase, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(fieldBase, 'h-10 appearance-none pr-9', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  )
}

export function MoneyInput({
  className,
  unit = '¥',
  ...props
}: ComponentProps<'input'> & { unit?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
        {unit}
      </span>
      <input
        className={cn(fieldBase, 'h-10 pl-8 tabular', className)}
        inputMode="numeric"
        {...props}
      />
    </div>
  )
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn('mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-ink', className)}
      {...props}
    />
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  aside,
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
  aside?: ReactNode
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        <span>{label}</span>
        {aside ? <span className="font-medium text-muted">{aside}</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[0.7rem] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function FieldGrid({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)} {...props} />
}
