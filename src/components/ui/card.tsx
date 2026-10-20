import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-[1.35rem] border border-line bg-surface text-ink shadow-card',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-4 gap-y-3 px-5 pt-5 sm:px-6 sm:pt-6',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return (
    <h3
      className={cn('text-[0.95rem] font-bold tracking-tight text-ink', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('mt-1 text-xs leading-relaxed text-muted', className)} {...props} />
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-5 pb-5 pt-4 sm:px-6 sm:pb-6', className)} {...props} />
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center gap-3 border-t border-line px-5 py-3.5 sm:px-6', className)}
      {...props}
    />
  )
}

export function CardKicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted',
        className,
      )}
    >
      {children}
    </span>
  )
}
