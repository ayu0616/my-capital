import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[1.2rem] border border-dashed border-line bg-canvas/35 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-brand/10 bg-brand-soft text-brand">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
