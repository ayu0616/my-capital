import { Info } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

export function InfoTip({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hovered || pinned
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const update = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(260, window.innerWidth - 16)
      let left = rect.left
      if (left + width > window.innerWidth - 8) {
        left = window.innerWidth - width - 8
      }
      if (left < 8) left = 8
      setPos({ top: rect.bottom + 6, left })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        buttonRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return
      }
      setPinned(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPinned(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="説明を表示"
        aria-expanded={open}
        onClick={() => setPinned((value) => !value)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="flex size-4 shrink-0 items-center justify-center rounded-full border border-line/80 bg-canvas/60 text-muted transition hover:border-brand/30 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <Info className="size-2.5" />
      </button>
      {open && pos ? (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="fixed z-[100] max-w-[260px] rounded-xl border border-line bg-surface px-3 py-2 text-[0.62rem] leading-relaxed text-muted shadow-lg"
          style={{ top: pos.top, left: pos.left, width: Math.min(260, window.innerWidth - 16) }}
        >
          {text}
        </div>
      ) : null}
    </span>
  )
}
