import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function ProgressRing({
  value,
  size = 120,
  stroke = 9,
  color = 'var(--brand)',
  trackColor = 'color-mix(in oklab, var(--ink) 8%, transparent)',
  children,
  className,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  children?: ReactNode
  className?: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(1, value))
  const dash = circumference * pct

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(pct * 100)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}

/** Compact SVG sparkline — no chart library needed. */
export function Sparkline({
  data,
  width = 320,
  height = 64,
  color = '#d7b878',
  className,
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
}) {
  const points = data.length >= 2 ? data : [0, 0]
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const padding = 3
  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width
    const y =
      height - padding - ((value - min) / span) * (height - padding * 2)
    return [x, y] as const
  })
  const line = coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const last = coords[coords.length - 1]
  const gradientId = `spark-${color.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  )
}
