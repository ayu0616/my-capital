import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
  {
    variants: {
      variant: {
        default:
          'bg-brand text-brand-contrast shadow-[0_8px_20px_-10px_rgba(16,72,50,0.7)] hover:bg-brand-strong',
        secondary:
          'bg-brand-soft text-brand-ink hover:bg-brand-soft/70 border border-brand/10',
        outline:
          'border border-line bg-surface text-ink hover:border-brand/30 hover:bg-brand-soft/40',
        ghost: 'text-muted hover:bg-ink/5 hover:text-ink',
        danger:
          'border border-danger/20 bg-danger/10 text-danger hover:bg-danger/15',
        gold: 'bg-gold text-white shadow-[0_8px_20px_-10px_rgba(145,100,40,0.65)] hover:bg-gold-strong',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-[13px]',
        lg: 'h-12 px-6 text-sm',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants>

export function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
