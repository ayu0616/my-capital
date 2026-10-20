import { cn } from '../../lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-[0.72rem] bg-[linear-gradient(145deg,#edd9ad_0%,#c99a52_55%,#a97733_100%)] font-display text-[1.18rem] font-semibold text-[#10251b] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_6px_14px_-8px_rgba(0,0,0,0.55)]',
        className,
      )}
    >
      A
    </span>
  )
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className={compact ? 'size-8 rounded-[0.65rem] text-base' : undefined} />
      <span className="leading-tight">
        <span className="block text-[0.8rem] font-extrabold tracking-tight text-ink">
          Asset &amp; Life
        </span>
        <span className="mt-0.5 block text-[0.48rem] font-bold tracking-[0.3em] text-brand">
          STUDIO
        </span>
      </span>
    </span>
  )
}
