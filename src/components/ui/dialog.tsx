import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './button'

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const dialog = ref.current
    if (!dialog) return
    const onCancel = (event: Event) => {
      event.preventDefault()
      onOpenChange(false)
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [open, onOpenChange])

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === ref.current) onOpenChange(false)
      }}
      className={cn(
        'dialog-panel m-auto w-[calc(100%-1.5rem)] overflow-y-auto rounded-[1.5rem] border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-[#07110d]/55 backdrop:backdrop-blur-[3px]',
        'max-h-[min(88dvh,900px)]',
        widths[size],
      )}
    >
      {open ? (
        <div className="flex max-h-[min(88dvh,900px)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 id={titleId} className="text-base font-bold tracking-tight">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="閉じる"
              className="-mr-1 -mt-1"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-line bg-canvas/40 px-5 py-4 sm:px-6">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = '削除する',
  pending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  pending?: boolean
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? '処理中…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </Dialog>
  )
}
